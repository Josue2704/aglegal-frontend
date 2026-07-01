import type { Category, CategoryKind, ServiceProduct, Choice } from '@/types'
import api from './client'

export const categoriesApi = {
  list: (kind: CategoryKind) => api.get<Category[]>('/categories', { params: { kind } }).then((r) => r.data),
  create: (data: { kind: CategoryKind; name: string }) => api.post<Category>('/categories', data).then((r) => r.data),
  update: (id: number, data: { name: string }) => api.put<Category>(`/categories/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/categories/${id}`),
  // Service products
  listProducts: (params?: { category_id?: number; active_only?: boolean }) =>
    api.get<ServiceProduct[]>('/categories/service-products', { params }).then((r) => r.data),
  productChoices: (category_id?: number) =>
    api.get<Choice[]>('/categories/service-products/choices', { params: category_id ? { category_id } : undefined }).then((r) => r.data),
  createProduct: (data: { category_id: number; name: string; description?: string; base_price?: number | null; active?: boolean }) =>
    api.post<ServiceProduct>('/categories/service-products', data).then((r) => r.data),
  updateProduct: (id: number, data: { category_id: number; name: string; description?: string; base_price?: number | null; active?: boolean }) =>
    api.put<ServiceProduct>(`/categories/service-products/${id}`, data).then((r) => r.data),
  deleteProduct: (id: number) => api.delete(`/categories/service-products/${id}`),
}
