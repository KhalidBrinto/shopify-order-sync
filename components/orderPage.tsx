"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ChevronDown, ChevronUp, ChevronsUpDown, Eye, X, Filter, Search } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

interface Customer {
  id: number;
  shopifyCustomerId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface LineItem {
  id: number;
  title: string;
  quantity: number;
  price: number | null;
  sku: string | null;
  productId: string | null;
  variantId: string | null;
}

interface Address {
  id: number;
  type: "shipping" | "billing";
  firstName: string | null;
  lastName: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
}

interface Order {
  id: number;
  shopifyOrderId: string;
  name: string | null;
  totalPrice: number | null;
  currency: string | null;
  orderStatus: string | null;
  createdAt: string;
  updatedAt: string;
  customerId: number;
  customer: Customer;
  lineItems: LineItem[];
  addresses: Address[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface OrdersResponse {
  orders: Order[];
  pagination: PaginationInfo;
}

type SortField = 'createdAt' | 'name' | 'totalPrice' | 'orderStatus' | 'customer';
type SortDirection = 'asc' | 'desc';

interface Filters {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  minPrice: string;
  maxPrice: string;
}

interface OrdersPageProps {
  refreshKey: number;
}

export default function OrdersPage({ refreshKey }: OrdersPageProps) {
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    minPrice: '',
    maxPrice: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchOrders = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/orders?page=${page}&limit=50`);
      if (response.ok) {
        const data: OrdersResponse = await response.json();
        setAllOrders(data.orders);
        setOrders(data.orders);
        setPagination(data.pagination);
        setCurrentPage(data.pagination.page);
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchOrders(currentPage);
  }, [refreshKey, currentPage]);


  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const applyFilters = () => {
    let filteredOrders = [...allOrders];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredOrders = filteredOrders.filter(order => 
        order.name?.toLowerCase().includes(searchTerm) ||
        order.shopifyOrderId.toLowerCase().includes(searchTerm) ||
        order.customer.firstName?.toLowerCase().includes(searchTerm) ||
        order.customer.lastName?.toLowerCase().includes(searchTerm) ||
        order.customer.email?.toLowerCase().includes(searchTerm)
      );
    }

    // Status filter
    if (filters.status) {
      filteredOrders = filteredOrders.filter(order => 
        order.orderStatus?.toLowerCase() === filters.status.toLowerCase()
      );
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filteredOrders = filteredOrders.filter(order => 
        new Date(order.createdAt) >= fromDate
      );
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filteredOrders = filteredOrders.filter(order => 
        new Date(order.createdAt) <= toDate
      );
    }

    // Price range filter
    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice);
      filteredOrders = filteredOrders.filter(order => 
        order.totalPrice && order.totalPrice >= minPrice
      );
    }

    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice);
      filteredOrders = filteredOrders.filter(order => 
        order.totalPrice && order.totalPrice <= maxPrice
      );
    }

    // Apply sorting
    filteredOrders.sort((a, b) => {
      let aValue: string | number | Date, bValue: string | number | Date;

      switch (sortField) {
        case 'name':
          aValue = a.name || a.shopifyOrderId;
          bValue = b.name || b.shopifyOrderId;
          break;
        case 'customer':
          aValue = `${a.customer.firstName} ${a.customer.lastName}`.toLowerCase();
          bValue = `${b.customer.firstName} ${b.customer.lastName}`.toLowerCase();
          break;
        case 'totalPrice':
          aValue = a.totalPrice || 0;
          bValue = b.totalPrice || 0;
          break;
        case 'orderStatus':
          aValue = a.orderStatus?.toLowerCase() || '';
          bValue = b.orderStatus?.toLowerCase() || '';
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setOrders(filteredOrders);
  };

  useEffect(() => {
    applyFilters();
  }, [filters, sortField, sortDirection, allOrders]);

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      minPrice: '',
      maxPrice: '',
    });
  };

  const formatPrice = (price: number | null | string, currency: string | null) => {
    if (price === null || price === undefined) return 'N/A';
    
    // Convert to number if it's a string
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(numericPrice)) return 'N/A';
    
    const currencySymbol = currency === 'USD' ? '$' : currency || '$';
    return `${currencySymbol} ${numericPrice.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'fulfilled':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Fulfilled</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Pending'}</Badge>;
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  // Generate pagination items with ellipsis
  const generatePaginationItems = () => {
    if (!pagination) return [];

    const { page: current, totalPages } = pagination;
    const items: (number | 'ellipsis')[] = [];

    if (totalPages <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      // Always show first page
      items.push(1);

      if (current <= 4) {
        // Show pages 2-5, then ellipsis, then last page
        for (let i = 2; i <= 5; i++) {
          items.push(i);
        }
        items.push('ellipsis');
        items.push(totalPages);
      } else if (current >= totalPages - 3) {
        // Show first page, ellipsis, then last 4 pages
        items.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          items.push(i);
        }
      } else {
        // Show first page, ellipsis, current-1, current, current+1, ellipsis, last page
        items.push('ellipsis');
        items.push(current - 1);
        items.push(current);
        items.push(current + 1);
        items.push('ellipsis');
        items.push(totalPages);
      }
    }

    return items;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-left">
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground">
              Manage and view your Shopify orders
            </p>
          </div>
          {isSyncing && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
              <span className="text-green-600 text-sm">Syncing...</span>
            </div>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search orders, customers..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-input rounded-md bg-background text-sm"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date From</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date To</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  />
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Price</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Price</label>
                  <input
                    type="number"
                    placeholder="1000.00"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {orders.length} of {allOrders.length} orders
            {filters.search || filters.status || filters.dateFrom || filters.dateTo || filters.minPrice || filters.maxPrice ? ' (filtered)' : ''}
          </div>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No orders found</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Modern Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-2">
                          Order
                          <SortIcon field="name" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('customer')}
                      >
                        <div className="flex items-center gap-2">
                          Customer
                          <SortIcon field="customer" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('totalPrice')}
                      >
                        <div className="flex items-center gap-2">
                          Total
                          <SortIcon field="totalPrice" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('orderStatus')}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          <SortIcon field="orderStatus" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('createdAt')}
                      >
                        <div className="flex items-center gap-2">
                          Date
                          <SortIcon field="createdAt" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow 
                        key={order.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {order.name || `Order #${order.shopifyOrderId}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              #{order.shopifyOrderId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {order.customer.firstName} {order.customer.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.customer.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatPrice(order.totalPrice, order.currency)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.orderStatus)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(selectedOrder?.id === order.id ? null : order);
                            }}
                          >
                            {selectedOrder?.id === order.id ? (
                              <X className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Expanded Order Details */}
            {selectedOrder && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      Order Details - {selectedOrder.name || `#${selectedOrder.shopifyOrderId}`}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedOrder(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Line Items */}
                    {selectedOrder.lineItems.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Items</h4>
                        <div className="space-y-2">
                          {selectedOrder.lineItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                              <div>
                                <span className="font-medium">{item.title}</span>
                                <div className="text-sm text-muted-foreground">
                                  Quantity: {item.quantity}
                                </div>
                              </div>
                              {item.sku && (
                                <Badge variant="outline" className="text-xs">
                                  SKU: {item.sku}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Addresses */}
                    {selectedOrder.addresses.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Addresses</h4>
                        <div className="space-y-3">
                          {selectedOrder.addresses.map((address) => (
                            <div key={address.id} className="p-4 bg-muted/50 rounded-lg">
                              <h5 className="text-xs font-medium uppercase mb-2 text-muted-foreground">
                                {address.type} Address
                              </h5>
                              <div className="text-sm space-y-1">
                                <p className="font-medium">
                                  {address.firstName} {address.lastName}
                                </p>
                                <p>{address.address1}</p>
                                {address.address2 && <p>{address.address2}</p>}
                                <p>{address.city}, {address.province} {address.zip}</p>
                                <p>{address.country}</p>
                                {address.phone && <p className="text-muted-foreground">{address.phone}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
} 