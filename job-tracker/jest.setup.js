import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => {
      const allHeaders = {
        'content-type': 'application/json',
        ...(init?.headers || {})
      };
      
      const response = new global.Response(JSON.stringify(data), {
        status: init?.status || 200,
        headers: allHeaders
      });
      
      response.headers = {
        get: (key) => {
          const normalizedKey = key.toLowerCase();
          const normalizedHeaders = {};
          Object.keys(allHeaders).forEach(k => {
            normalizedHeaders[k.toLowerCase()] = allHeaders[k];
          });
          return normalizedHeaders[normalizedKey] || null;
        },
        has: (key) => {
          const normalizedKey = key.toLowerCase();
          return Object.keys(allHeaders).some(k => k.toLowerCase() === normalizedKey);
        }
      };
      return response;
    }
  },
  NextRequest: global.Request
}));

// Mock environment variables for testing
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  OPENAI_API_KEY: '',
  JWT_SECRET: 'test-secret',
};

// Mock Next.js Request/Response
global.Request = class MockRequest {
  constructor(input, init) {
    this._url = input;
    this.method = init?.method || 'GET';
    this._headers = init?.headers || {};
    this.body = init?.body;
    
    // Create headers object with get method
    this.headers = {
      get: (name) => {
        const key = Object.keys(this._headers).find(k => k.toLowerCase() === name.toLowerCase());
        return key ? this._headers[key] : null;
      },
      has: (name) => {
        return Object.keys(this._headers).some(k => k.toLowerCase() === name.toLowerCase());
      },
      forEach: (callback) => {
        Object.entries(this._headers).forEach(([key, value]) => callback(value, key));
      }
    };
  }
  
  get url() {
    return this._url;
  }
  
  json() {
    return Promise.resolve(JSON.parse(this.body || '{}'));
  }
};

global.Response = class MockResponse {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.headers = new Map(Object.entries(init?.headers || {}));
    this.ok = this.status >= 200 && this.status < 300;
  }
  
  json() {
    try {
      if (typeof this.body === 'string') {
        return Promise.resolve(JSON.parse(this.body));
      } else if (typeof this.body === 'object') {
        return Promise.resolve(this.body);
      }
      return Promise.resolve({});
    } catch {
      return Promise.resolve({});
    }
  }
  
  text() {
    return Promise.resolve(typeof this.body === 'string' ? this.body : JSON.stringify(this.body || {}));
  }
};

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Configure PDF.js for testing
const path = require('path');

// Set up PDF.js worker source for node environment
global.PDFJS = {
  workerSrc: path.join(__dirname, 'node_modules', 'pdf-parse', 'lib', 'pdf.js', 'v1.10.100', 'build', 'pdf.worker.js')
};

// Additional window/document mocks for PDF.js if not already defined
if (typeof global.window === 'undefined') {
  global.window = {
    location: { href: 'http://localhost' }
  };
}

if (typeof global.document === 'undefined') {
  global.document = {
    createElement: () => ({}),
    head: { appendChild: () => {} }
  };
}

// Set PDF.js worker src directly
if (typeof window !== 'undefined' && !window.pdfjsLib) {
  window.pdfjsLib = {
    GlobalWorkerOptions: {
      workerSrc: path.join(__dirname, 'node_modules', 'pdf-parse', 'lib', 'pdf.js', 'v1.10.100', 'build', 'pdf.worker.js')
    }
  };
}

// Increase default timeout for tests
jest.setTimeout(30000);