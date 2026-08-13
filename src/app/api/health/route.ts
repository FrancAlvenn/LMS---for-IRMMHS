import { NextResponse } from 'next/server';

import { connect } from '@/server/db/connect';
import { fail, ok } from '@/server/lib/apiResponse';

export async function GET() {
  try {
    const mongooseInstance = await connect();
    const dbConnected = mongooseInstance.connection.readyState === 1;
    return NextResponse.json(ok({ status: 'ok', dbConnected }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(fail(message, 'DB_CONNECTION_FAILED'), { status: 503 });
  }
}
