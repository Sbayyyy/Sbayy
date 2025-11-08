import { useState } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { AlertCircle, Check, Copy, Play, RefreshCw } from 'lucide-react';

type ApiTest = 
  // Orders & Shipping
  | 'shipping' | 'createOrder' | 'getOrder' | 'addresses' | 'saveAddress'
  // Auth
  | 'login' | 'register' | 'logout' | 'forgotPassword' | 'resetPassword'
  // Listings
  | 'createListing' | 'getListing' | 'updateListing' | 'deleteListing' | 'getAllListings' | 'getMyListings'
  // Search
  | 'search' | 'suggestions'
  // Upload
  | 'uploadImage' | 'uploadImages';

interface ApiEndpoint {
  id: ApiTest;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  label: string;
  description: string;
  category: 'Orders' | 'Auth' | 'Listings' | 'Search' | 'Upload';
  defaultRequest: Record<string, unknown>;
}

interface ApiCallResponse {
  status: number;
  endpoint: string;
  method: string;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  timestamp: string;
  executionTime: number;
}

const apiEndpoints: Record<ApiTest, ApiEndpoint> = {
  // === ORDERS & SHIPPING ===
  shipping: {
    id: 'shipping',
    method: 'POST',
    path: '/api/shipping/calculate',
    label: 'Calculate Shipping',
    description: 'Berechnet DHL Versandkosten basierend auf Stadt und Items',
    category: 'Orders',
    defaultRequest: {
      city: 'Damascus',
      weight: 2.5,
      items: [
        { productId: '1', quantity: 2 },
        { productId: '3', quantity: 1 }
      ]
    }
  },
  createOrder: {
    id: 'createOrder',
    method: 'POST',
    path: '/api/orders',
    label: 'Create Order',
    description: 'Erstellt neue Bestellung mit Adresse, Items und Zahlungsmethode',
    category: 'Orders',
    defaultRequest: {
      shippingAddress: {
        name: 'Ahmed Al-Hakim',
        phone: '+963987654321',
        street: 'Malki St',
        city: 'Damascus',
        region: 'Mezzeh'
      },
      items: [
        { productId: '1', quantity: 2, price: 15000 },
        { productId: '3', quantity: 1, price: 8000 }
      ],
      paymentMethod: 'cod',
      shippingCost: 35,
      saveAddress: true
    }
  },
  getOrder: {
    id: 'getOrder',
    method: 'GET',
    path: '/api/orders/:orderId',
    label: 'Get Order Details',
    description: 'Ruft komplette Bestelldetails ab',
    category: 'Orders',
    defaultRequest: {
      orderId: 'ORD-2025-001234'
    }
  },
  addresses: {
    id: 'addresses',
    method: 'GET',
    path: '/api/addresses',
    label: 'Get Addresses',
    description: 'Ruft alle gespeicherten Adressen des Users ab',
    category: 'Orders',
    defaultRequest: {}
  },
  saveAddress: {
    id: 'saveAddress',
    method: 'POST',
    path: '/api/addresses',
    label: 'Save Address',
    description: 'Speichert neue Adresse für späteren Gebrauch',
    category: 'Orders',
    defaultRequest: {
      name: 'Work Address',
      phone: '+963912345678',
      street: 'Business Center',
      city: 'Aleppo',
      region: 'Downtown'
    }
  },

  // === AUTH ===
  login: {
    id: 'login',
    method: 'POST',
    path: '/api/auth/login',
    label: 'Login',
    description: 'User Login mit Email/Username und Password',
    category: 'Auth',
    defaultRequest: {
      email: 'ahmed@example.com',
      password: 'password123'
    }
  },
  register: {
    id: 'register',
    method: 'POST',
    path: '/api/auth/register',
    label: 'Register',
    description: 'Neuen User Account erstellen',
    category: 'Auth',
    defaultRequest: {
      username: 'ahmed_syrian',
      email: 'ahmed@example.com',
      password: 'password123',
      firstName: 'Ahmed',
      lastName: 'Al-Hakim',
      phone: '+963987654321'
    }
  },
  logout: {
    id: 'logout',
    method: 'POST',
    path: '/api/auth/logout',
    label: 'Logout',
    description: 'User ausloggen und Token invalidieren',
    category: 'Auth',
    defaultRequest: {}
  },
  forgotPassword: {
    id: 'forgotPassword',
    method: 'POST',
    path: '/api/auth/forgot-password',
    label: 'Forgot Password',
    description: 'Password Reset Email anfordern',
    category: 'Auth',
    defaultRequest: {
      email: 'ahmed@example.com'
    }
  },
  resetPassword: {
    id: 'resetPassword',
    method: 'POST',
    path: '/api/auth/reset-password',
    label: 'Reset Password',
    description: 'Neues Password mit Reset Token setzen',
    category: 'Auth',
    defaultRequest: {
      token: 'RESET-TOKEN-12345',
      newPassword: 'newPassword123'
    }
  },

  // === LISTINGS ===
  createListing: {
    id: 'createListing',
    method: 'POST',
    path: '/api/listings',
    label: 'Create Listing',
    description: 'Neues Produkt erstellen',
    category: 'Listings',
    defaultRequest: {
      title: 'iPhone 12 Pro 128GB',
      description: 'Guter Zustand, mit Originalverpackung',
      category: 'Electronics',
      condition: 'used',
      priceAmount: 15000,
      stock: 1,
      images: ['https://example.com/image1.jpg'],
      location: 'Damascus'
    }
  },
  getListing: {
    id: 'getListing',
    method: 'GET',
    path: '/api/listings/:id',
    label: 'Get Listing',
    description: 'Einzelnes Produkt abrufen',
    category: 'Listings',
    defaultRequest: {
      id: 'PROD-12345'
    }
  },
  updateListing: {
    id: 'updateListing',
    method: 'PUT',
    path: '/api/listings/:id',
    label: 'Update Listing',
    description: 'Produkt bearbeiten',
    category: 'Listings',
    defaultRequest: {
      id: 'PROD-12345',
      title: 'iPhone 12 Pro 128GB - Reduziert!',
      priceAmount: 14000,
      stock: 1
    }
  },
  deleteListing: {
    id: 'deleteListing',
    method: 'DELETE',
    path: '/api/listings/:id',
    label: 'Delete Listing',
    description: 'Produkt löschen',
    category: 'Listings',
    defaultRequest: {
      id: 'PROD-12345'
    }
  },
  getAllListings: {
    id: 'getAllListings',
    method: 'GET',
    path: '/api/listings',
    label: 'Get All Listings',
    description: 'Alle Produkte mit Pagination und Filtern',
    category: 'Listings',
    defaultRequest: {
      page: 1,
      limit: 20,
      category: 'Electronics',
      sortBy: 'date',
      sortOrder: 'desc'
    }
  },
  getMyListings: {
    id: 'getMyListings',
    method: 'GET',
    path: '/api/listings/my-listings',
    label: 'Get My Listings',
    description: 'Meine eigenen Produkte abrufen',
    category: 'Listings',
    defaultRequest: {}
  },

  // === SEARCH ===
  search: {
    id: 'search',
    method: 'GET',
    path: '/api/listings/search',
    label: 'Search Products',
    description: 'Produkte durchsuchen mit Query und Filtern',
    category: 'Search',
    defaultRequest: {
      q: 'iphone',
      category: 'Electronics',
      minPrice: 5000,
      maxPrice: 20000,
      condition: 'used',
      page: 1,
      limit: 20
    }
  },
  suggestions: {
    id: 'suggestions',
    method: 'GET',
    path: '/api/listings/search/suggestions',
    label: 'Search Suggestions',
    description: 'Autocomplete Vorschläge für Suchbegriffe',
    category: 'Search',
    defaultRequest: {
      q: 'iph',
      limit: 5
    }
  },

  // === UPLOAD ===
  uploadImage: {
    id: 'uploadImage',
    method: 'POST',
    path: '/api/upload/image',
    label: 'Upload Single Image',
    description: 'Einzelnes Bild hochladen (FormData)',
    category: 'Upload',
    defaultRequest: {
      image: 'FILE_UPLOAD'
    }
  },
  uploadImages: {
    id: 'uploadImages',
    method: 'POST',
    path: '/api/upload/images',
    label: 'Upload Multiple Images',
    description: 'Mehrere Bilder hochladen (FormData)',
    category: 'Upload',
    defaultRequest: {
      images: ['FILE_UPLOAD_1', 'FILE_UPLOAD_2']
    }
  }
};

// Mock Response Generator
function generateMockResponse(endpoint: ApiTest, request: Record<string, unknown>): Omit<ApiCallResponse, 'timestamp' | 'executionTime'> {
  const responses: Record<ApiTest, Omit<ApiCallResponse, 'timestamp' | 'executionTime'>> = {
    // === ORDERS & SHIPPING ===
    shipping: {
      status: 200,
      endpoint: 'POST /api/shipping/calculate',
      method: 'POST',
      request,
      response: {
        carrier: 'DHL',
        cost: 35,
        currency: 'SYP',
        estimatedDays: 3,
        trackingUrl: 'https://dhl.com/tracking'
      }
    },
    createOrder: {
      status: 201,
      endpoint: 'POST /api/orders',
      method: 'POST',
      request,
      response: {
        orderId: 'ORD-2025-001234',
        status: 'pending',
        subtotal: 23000,
        shippingCost: 35,
        total: 23035,
        currency: 'SYP',
        createdAt: new Date().toISOString(),
        estimatedDelivery: '2025-11-11'
      }
    },
    getOrder: {
      status: 200,
      endpoint: 'GET /api/orders/ORD-2025-001234',
      method: 'GET',
      request,
      response: {
        orderId: 'ORD-2025-001234',
        status: 'shipped',
        items: [
          { productId: '1', title: 'iPhone 12 Pro', quantity: 2, price: 15000 },
          { productId: '3', title: 'iPhone Case', quantity: 1, price: 8000 }
        ],
        shippingAddress: { name: 'Ahmed Al-Hakim', phone: '+963987654321', street: 'Malki St', city: 'Damascus' },
        paymentMethod: 'cod',
        subtotal: 23000,
        shippingCost: 35,
        total: 23035,
        currency: 'SYP',
        trackingNumber: 'DHL1234567890'
      }
    },
    addresses: {
      status: 200,
      endpoint: 'GET /api/addresses',
      method: 'GET',
      request,
      response: {
        addresses: [
          { id: 'ADDR-001', name: 'Ahmed Al-Hakim', phone: '+963987654321', street: 'Malki St', city: 'Damascus', region: 'Mezzeh', isDefault: true },
          { id: 'ADDR-002', name: 'Ahmed Work', phone: '+963912345678', street: 'Business District', city: 'Aleppo', region: 'Downtown', isDefault: false }
        ]
      }
    },
    saveAddress: {
      status: 201,
      endpoint: 'POST /api/addresses',
      method: 'POST',
      request,
      response: {
        id: 'ADDR-003',
        name: 'Work Address',
        phone: '+963912345678',
        street: 'Business Center',
        city: 'Aleppo',
        region: 'Downtown',
        isDefault: false,
        createdAt: new Date().toISOString()
      }
    },

    // === AUTH ===
    login: {
      status: 200,
      endpoint: 'POST /api/auth/login',
      method: 'POST',
      request,
      response: {
        user: {
          id: 'USER-001',
          username: 'ahmed_syrian',
          email: 'ahmed@example.com',
          firstName: 'Ahmed',
          lastName: 'Al-Hakim'
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'refresh_token_here',
        expiresIn: 3600
      }
    },
    register: {
      status: 201,
      endpoint: 'POST /api/auth/register',
      method: 'POST',
      request,
      response: {
        user: {
          id: 'USER-002',
          username: 'ahmed_syrian',
          email: 'ahmed@example.com',
          firstName: 'Ahmed',
          lastName: 'Al-Hakim',
          createdAt: new Date().toISOString()
        },
        message: 'Account created successfully'
      }
    },
    logout: {
      status: 200,
      endpoint: 'POST /api/auth/logout',
      method: 'POST',
      request,
      response: {
        message: 'Logged out successfully'
      }
    },
    forgotPassword: {
      status: 200,
      endpoint: 'POST /api/auth/forgot-password',
      method: 'POST',
      request,
      response: {
        message: 'Password reset email sent',
        email: request.email
      }
    },
    resetPassword: {
      status: 200,
      endpoint: 'POST /api/auth/reset-password',
      method: 'POST',
      request,
      response: {
        message: 'Password reset successfully'
      }
    },

    // === LISTINGS ===
    createListing: {
      status: 201,
      endpoint: 'POST /api/listings',
      method: 'POST',
      request,
      response: {
        id: 'PROD-12345',
        title: 'iPhone 12 Pro 128GB',
        description: 'Guter Zustand, mit Originalverpackung',
        category: 'Electronics',
        condition: 'used',
        priceAmount: 15000,
        currency: 'SYP',
        stock: 1,
        images: ['https://example.com/image1.jpg'],
        location: 'Damascus',
        seller: { id: 'USER-001', username: 'ahmed_syrian' },
        createdAt: new Date().toISOString()
      }
    },
    getListing: {
      status: 200,
      endpoint: 'GET /api/listings/PROD-12345',
      method: 'GET',
      request,
      response: {
        id: 'PROD-12345',
        title: 'iPhone 12 Pro 128GB',
        description: 'Guter Zustand, mit Originalverpackung',
        category: 'Electronics',
        condition: 'used',
        priceAmount: 15000,
        currency: 'SYP',
        stock: 1,
        images: ['https://example.com/image1.jpg'],
        location: 'Damascus',
        seller: { id: 'USER-001', username: 'ahmed_syrian', rating: 4.8 },
        views: 245,
        createdAt: '2025-11-01T10:00:00Z'
      }
    },
    updateListing: {
      status: 200,
      endpoint: 'PUT /api/listings/PROD-12345',
      method: 'PUT',
      request,
      response: {
        id: 'PROD-12345',
        title: 'iPhone 12 Pro 128GB - Reduziert!',
        priceAmount: 14000,
        stock: 1,
        updatedAt: new Date().toISOString()
      }
    },
    deleteListing: {
      status: 200,
      endpoint: 'DELETE /api/listings/PROD-12345',
      method: 'DELETE',
      request,
      response: {
        message: 'Listing deleted successfully',
        id: 'PROD-12345'
      }
    },
    getAllListings: {
      status: 200,
      endpoint: 'GET /api/listings',
      method: 'GET',
      request,
      response: {
        items: [
          { id: 'PROD-001', title: 'iPhone 12 Pro', priceAmount: 15000, condition: 'used', location: 'Damascus' },
          { id: 'PROD-002', title: 'Samsung Galaxy S21', priceAmount: 12000, condition: 'new', location: 'Aleppo' }
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      }
    },
    getMyListings: {
      status: 200,
      endpoint: 'GET /api/listings/my-listings',
      method: 'GET',
      request,
      response: {
        items: [
          { id: 'PROD-12345', title: 'iPhone 12 Pro', priceAmount: 15000, status: 'active', views: 245 }
        ],
        total: 1
      }
    },

    // === SEARCH ===
    search: {
      status: 200,
      endpoint: 'GET /api/listings/search',
      method: 'GET',
      request,
      response: {
        items: [
          { id: 'PROD-001', title: 'iPhone 12 Pro 128GB', priceAmount: 15000, condition: 'used', location: 'Damascus' },
          { id: 'PROD-003', title: 'iPhone 11 64GB', priceAmount: 10000, condition: 'used', location: 'Homs' }
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
        query: 'iphone'
      }
    },
    suggestions: {
      status: 200,
      endpoint: 'GET /api/listings/search/suggestions',
      method: 'GET',
      request,
      response: {
        suggestions: ['iphone', 'iphone 12', 'iphone 13', 'iphone case', 'iphone charger']
      }
    },

    // === UPLOAD ===
    uploadImage: {
      status: 201,
      endpoint: 'POST /api/upload/image',
      method: 'POST',
      request,
      response: {
        url: 'https://sbay.storage/images/12345-image.jpg',
        filename: '12345-image.jpg',
        size: 245000,
        mimeType: 'image/jpeg'
      }
    },
    uploadImages: {
      status: 201,
      endpoint: 'POST /api/upload/images',
      method: 'POST',
      request,
      response: {
        urls: [
          'https://sbay.storage/images/12345-image1.jpg',
          'https://sbay.storage/images/12346-image2.jpg'
        ],
        count: 2
      }
    }
  };

  return responses[endpoint];
}

export default function ApiPreviewPage() {
  const [activeApi, setActiveApi] = useState<ApiTest>('shipping');
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<ApiCallResponse | null>(null);
  const [requestBody, setRequestBody] = useState(JSON.stringify(apiEndpoints.shipping.defaultRequest, null, 2));
  const [requestError, setRequestError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleApiChange = (apiId: ApiTest) => {
    setActiveApi(apiId);
    setRequestBody(JSON.stringify(apiEndpoints[apiId].defaultRequest, null, 2));
    setApiResponse(null);
    setRequestError('');
  };

  const handleTestApi = async () => {
    setRequestError('');
    
    // Validate JSON
    let parsedRequest: Record<string, unknown>;
    try {
      parsedRequest = JSON.parse(requestBody);
    } catch (e) {
      setRequestError('❌ Invalid JSON: ' + (e instanceof Error ? e.message : 'Unknown error'));
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const mockData = generateMockResponse(activeApi, parsedRequest);
    setApiResponse({
      ...mockData,
      timestamp: new Date().toISOString(),
      executionTime: Math.random() * 400 + 100 // 100-500ms
    });
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const endpoint = apiEndpoints[activeApi];

  return (
    <Layout title="API Preview">
      <div className="bg-gray-50 min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">🔌 API Preview - Swagger UI</h1>
              <p className="text-gray-600">Teste alle {Object.keys(apiEndpoints).length} API Endpoints (Orders, Auth, Listings, Search, Upload)</p>
            </div>
            <Link href="/test/preview" className="text-blue-600 hover:underline font-medium flex items-center gap-2">
              ← Component Preview
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Sidebar - API List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-24 max-h-[85vh] overflow-y-auto">
                <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 px-2">Endpoints ({Object.keys(apiEndpoints).length})</h3>
                
                {/* Group by Category */}
                {(['Orders', 'Auth', 'Listings', 'Search', 'Upload'] as const).map((category) => {
                  const categoryEndpoints = Object.values(apiEndpoints).filter(api => api.category === category);
                  return (
                    <div key={category} className="mb-6">
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 px-2">{category}</h4>
                      <div className="space-y-1">
                        {categoryEndpoints.map((api) => (
                          <button
                            key={api.id}
                            onClick={() => handleApiChange(api.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              activeApi === api.id
                                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                api.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                                api.method === 'POST' ? 'bg-green-100 text-green-700' :
                                api.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                                api.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {api.method}
                              </span>
                              <span className="truncate">{api.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-4 space-y-6">
              {/* Endpoint Details */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-sm font-bold px-3 py-1 rounded text-white ${
                      endpoint.method === 'GET' ? 'bg-blue-600' :
                      endpoint.method === 'POST' ? 'bg-green-600' :
                      'bg-gray-600'
                    }`}>
                      {endpoint.method}
                    </span>
                    <code className="text-lg font-mono font-bold text-gray-800">{endpoint.path}</code>
                  </div>
                  <p className="text-gray-600 ml-2">{endpoint.description}</p>
                </div>

                <hr className="my-6" />

                {/* Request Body Editor */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">📤 Request Body (Editable)</h3>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="w-full h-48 font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    spellCheck={false}
                  />
                  {requestError && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle size={16} />
                      {requestError}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleTestApi}
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Play size={18} />
                    {loading ? 'Testing...' : 'Send Request'}
                  </button>
                  <button
                    onClick={() => setRequestBody(JSON.stringify(endpoint.defaultRequest, null, 2))}
                    className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-300"
                  >
                    <RefreshCw size={18} />
                    Reset
                  </button>
                </div>
              </div>

              {/* Response Section */}
              {apiResponse && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                        apiResponse.status >= 200 && apiResponse.status < 300
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }`}>
                        {apiResponse.status}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{apiResponse.endpoint}</p>
                        <p className="text-xs text-gray-600">
                          {apiResponse.executionTime.toFixed(0)}ms • {new Date(apiResponse.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <hr className="my-4" />

                    {/* Response Body */}
                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">📥 Response Body</h3>
                    <div className="bg-green-50 rounded-lg p-4 overflow-x-auto border border-green-200 relative group">
                      <pre className="text-xs text-green-900 font-mono whitespace-pre-wrap break-words">
                        {JSON.stringify(apiResponse.response, null, 2)}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(apiResponse.response, null, 2))}
                        className="absolute top-2 right-2 p-2 bg-green-200 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-300"
                      >
                        {copied ? (
                          <Check size={16} className="text-green-700" />
                        ) : (
                          <Copy size={16} className="text-green-700" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg flex gap-4">
            <AlertCircle className="text-blue-700 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-bold text-blue-900 mb-2">💡 API Preview - Testing Environment</h3>
              <p className="text-sm text-blue-800 mb-3">
                Diese Seite zeigt <strong>alle {Object.keys(apiEndpoints).length} API Endpoints</strong> mit <strong>Mock Responses</strong>. Du kannst Request Bodies editieren und Endpoints testen.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-blue-800">
                <div>
                  <strong>📦 Orders (5)</strong><br/>
                  Shipping, Orders, Addresses
                </div>
                <div>
                  <strong>🔐 Auth (5)</strong><br/>
                  Login, Register, Logout
                </div>
                <div>
                  <strong>📋 Listings (6)</strong><br/>
                  CRUD Operations
                </div>
                <div>
                  <strong>🔍 Search (2)</strong><br/>
                  Query, Suggestions
                </div>
                <div>
                  <strong>📤 Upload (2)</strong><br/>
                  Single, Multiple Images
                </div>
              </div>
              <p className="text-sm text-blue-800 mt-3">
                <strong>Status:</strong> Mock Responses (Ready for Backend Integration)
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
