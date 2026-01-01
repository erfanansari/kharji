import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!
});

// GET /api/tags - Get all tags
export async function GET() {
  try {
    const result = await client.execute('SELECT * FROM tags ORDER BY name ASC');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check if tag already exists
    const existing = await client.execute({
      sql: 'SELECT id FROM tags WHERE LOWER(name) = LOWER(?)',
      args: [trimmedName]
    });

    if (existing.rows.length > 0) {
      // Return existing tag
      return NextResponse.json(existing.rows[0]);
    }

    // Create new tag
    const result = await client.execute({
      sql: 'INSERT INTO tags (name) VALUES (?) RETURNING *',
      args: [trimmedName]
    });

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
