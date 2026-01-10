/**
 * API Route: /api/datasets/import
 * Import datasets from CSV or JSON (Task 64)
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../../../../agent-evals/src/db/connection';
import { runMigrations } from '../../../../../agent-evals/src/db/migrate';
import { datasets, datasetRows } from '../../../../../agent-evals/src/db/schema';

// Initialize database on first request
let dbInitialized = false;

function initDb() {
  if (!dbInitialized) {
    try {
      runMigrations();
      dbInitialized = true;
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }
  return getDb();
}

/**
 * Parse CSV string into rows
 */
function parseCSV(csv: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csv.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });

  return { headers, rows };
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  values.push(current.trim());
  return values;
}

export async function POST(request: NextRequest) {
  try {
    const db = initDb();
    const contentType = request.headers.get('content-type') || '';

    let name: string;
    let description: string = '';
    let variables: string[] = [];
    let rows: Record<string, string>[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      name = (formData.get('name') as string) || 'Imported Dataset';
      description = (formData.get('description') as string) || '';

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      const text = await file.text();
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.csv')) {
        const parsed = parseCSV(text);
        variables = parsed.headers;
        rows = parsed.rows;
      } else if (fileName.endsWith('.json')) {
        const jsonData = JSON.parse(text);
        if (Array.isArray(jsonData)) {
          // Array of objects
          if (jsonData.length > 0) {
            variables = Object.keys(jsonData[0]);
            rows = jsonData;
          }
        } else if (jsonData.variables && jsonData.rows) {
          // Our export format
          variables = jsonData.variables;
          rows = jsonData.rows;
          name = jsonData.name || name;
          description = jsonData.description || description;
        } else {
          return NextResponse.json(
            { error: 'Invalid JSON format. Expected array of objects or {variables, rows}' },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Unsupported file format. Use CSV or JSON' },
          { status: 400 }
        );
      }
    } else {
      // Handle JSON body
      const body = await request.json();

      if (body.csv) {
        // CSV string in body
        name = body.name || 'Imported Dataset';
        description = body.description || '';
        const parsed = parseCSV(body.csv);
        variables = parsed.headers;
        rows = parsed.rows;
      } else if (body.rows && body.variables) {
        // Direct data
        name = body.name || 'Imported Dataset';
        description = body.description || '';
        variables = body.variables;
        rows = body.rows;
      } else if (Array.isArray(body)) {
        // Array of objects
        name = 'Imported Dataset';
        if (body.length > 0) {
          variables = Object.keys(body[0]);
          rows = body;
        }
      } else {
        return NextResponse.json(
          { error: 'Invalid request format' },
          { status: 400 }
        );
      }
    }

    // Validate
    if (variables.length === 0) {
      return NextResponse.json(
        { error: 'No variables found in import data' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const datasetId = uuidv4();

    // Insert the dataset
    await db.insert(datasets).values({
      id: datasetId,
      name,
      description,
      variables: JSON.stringify(variables),
      rowCount: rows.length,
      createdAt: now,
      updatedAt: now,
    });

    // Insert the rows
    if (rows.length > 0) {
      const rowInserts = rows.map((rowData, index) => ({
        id: uuidv4(),
        datasetId,
        rowIndex: index,
        data: JSON.stringify(rowData),
        createdAt: now,
      }));

      await db.insert(datasetRows).values(rowInserts);
    }

    return NextResponse.json({
      id: datasetId,
      name,
      description,
      variables,
      rowCount: rows.length,
      createdAt: now,
      updatedAt: now,
      message: `Dataset imported successfully with ${rows.length} rows`,
    });
  } catch (error) {
    console.error('Error importing dataset:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import dataset' },
      { status: 500 }
    );
  }
}
