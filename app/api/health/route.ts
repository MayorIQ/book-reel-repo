import { NextResponse } from 'next/server'

/**
 * Health Check Endpoint
 * 
 * Used by Docker healthcheck and monitoring systems
 * Returns 200 if application is healthy
 */
export async function GET() {
  try {
    // Basic health check - can be expanded to check:
    // - Database connection
    // - External API availability
    // - Disk space
    
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'BookReel',
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

