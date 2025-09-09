/**
 * Comprehensive error handling utilities for the Job Tracker application
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
  timestamp?: string;
  requestId?: string;
}

export interface ApiError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
}

export class GenericApiError extends Error implements ApiError {
  code?: string;
  statusCode?: number;
  details?: any;
  
  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'GenericApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Custom error classes for different error types
 */
export class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
  
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
  
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
  
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  code = 'CONFLICT';
  
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ExternalServiceError extends Error {
  statusCode = 503;
  code = 'EXTERNAL_SERVICE_ERROR';
  
  constructor(service: string, public originalError?: Error) {
    super(`External service error: ${service}`);
    this.name = 'ExternalServiceError';
  }
}

export class RateLimitError extends Error {
  statusCode = 429;
  code = 'RATE_LIMIT_EXCEEDED';
  
  constructor(message = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Handle Prisma database errors
 */
export function handlePrismaError(error: unknown): ApiError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new ConflictError(`Unique constraint failed: ${error.meta?.target}`);
      case 'P2025':
        return new NotFoundError('Record');
      case 'P2003':
        return new ValidationError('Foreign key constraint failed', error.meta);
      case 'P2014':
        return new ValidationError('Invalid ID provided', error.meta);
      default:
        return new GenericApiError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
    }
  }
  
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return new GenericApiError('Unknown database error', 500, 'DATABASE_ERROR');
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ValidationError('Invalid data provided');
  }
  
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new ExternalServiceError('Database connection failed');
  }
  
  return error as ApiError;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: ApiError | Error,
  requestId?: string
): NextResponse<ErrorResponse> {
  const apiError = error as ApiError;
  const statusCode = apiError.statusCode || 500;
  const code = apiError.code || 'INTERNAL_ERROR';
  
  const errorResponse: ErrorResponse = {
    error: error.message || 'An unexpected error occurred',
    code,
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
    ...(apiError.details && { details: apiError.details })
  };
  
  // Log error details for debugging
  if (statusCode >= 500) {
    console.error('Internal server error:', {
      error: error.message,
      code,
      stack: error.stack,
      requestId,
      details: apiError.details
    });
  } else {
    console.warn('Client error:', {
      error: error.message,
      code,
      requestId,
      statusCode
    });
  }
  
  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Async error handler wrapper for API routes
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse<ErrorResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError ||
          error instanceof Prisma.PrismaClientUnknownRequestError ||
          error instanceof Prisma.PrismaClientValidationError) {
        const prismaError = handlePrismaError(error);
        return createErrorResponse(prismaError);
      }
      
      if (error instanceof ValidationError ||
          error instanceof AuthenticationError ||
          error instanceof AuthorizationError ||
          error instanceof NotFoundError ||
          error instanceof ConflictError ||
          error instanceof ExternalServiceError ||
          error instanceof RateLimitError) {
        return createErrorResponse(error);
      }
      
      // Generic error handling
      const genericError = new GenericApiError(
        error instanceof Error ? error.message : 'An unexpected error occurred',
        500,
        'INTERNAL_ERROR'
      );
      
      return createErrorResponse(genericError);
    }
  };
}

/**
 * Retry mechanism for external service calls
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw new ExternalServiceError('Max retries exceeded', lastError);
      }
      
      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError!;
}

/**
 * Circuit breaker pattern for external services
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private maxFailures = 5,
    private timeout = 60000, // 1 minute
    private resetTimeout = 300000 // 5 minutes
  ) {}
  
  async call<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new ExternalServiceError('Circuit breaker is open');
      }
    }
    
    try {
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), this.timeout)
        )
      ]) as T;
      
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.maxFailures) {
      this.state = 'open';
    }
  }
  
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Input validation helpers
 */
export function validateRequired(value: any, fieldName: string): void {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
}

export function validateId(id: string, fieldName = 'ID'): void {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new ValidationError(`Invalid ${fieldName} format`);
  }
}

export function validateNumber(value: any, fieldName: string, min?: number, max?: number): void {
  const num = Number(value);
  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }
  
  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`);
  }
  
  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} must not exceed ${max}`);
  }
}

export function validateEnum(value: any, validValues: string[], fieldName: string): void {
  if (!validValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${validValues.join(', ')}`
    );
  }
}

/**
 * Request logging middleware
 */
export function logRequest(request: Request, startTime: number = Date.now()) {
  const duration = Date.now() - startTime;
  const method = request.method;
  const url = new URL(request.url).pathname;
  
  console.info(`${method} ${url} - ${duration}ms`);
}

/**
 * Health check utilities
 */
export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  lastChecked: string;
}

export async function checkServiceHealth(
  serviceName: string,
  healthCheck: () => Promise<boolean>
): Promise<HealthCheck> {
  const startTime = Date.now();
  const lastChecked = new Date().toISOString();
  
  try {
    const isHealthy = await healthCheck();
    const responseTime = Date.now() - startTime;
    
    return {
      service: serviceName,
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTime,
      lastChecked
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      service: serviceName,
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked
    };
  }
}