import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem(product) {
        const items = get().items;
        const matchId = product.is_custom
          ? items.find((i) => i.is_custom && i.product_name === product.name)?.product_id
          : product.id;
        const existing = items.find((i) => i.product_id === matchId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.product_id === matchId
                ? {
                    ...i,
                    quantity: parseFloat((i.quantity + 1).toFixed(1)),
                    subtotal: parseFloat(((i.quantity + 1) * i.price).toFixed(2)),
                  }
                : i
            ),
          });
        } else {
          // Custom items get a unique negative ID to avoid collisions
          const newId = product.is_custom ? -Date.now() : (product.id || 0);
          set({
            items: [
              ...items,
              {
                product_id: newId,
                product_name: product.name,
                price: product.price,
                unit: product.unit || '份',
                image_url: product.image_url || '',
                quantity: 1,
                subtotal: product.price || 0,
                remark: '',
                is_custom: product.is_custom || false,
              },
            ],
          });
        }
      },

      removeItem(productId) {
        set({ items: get().items.filter((i) => i.product_id !== productId) });
      },

      updateRemark(productId, remark) {
        set({
          items: get().items.map((i) =>
            i.product_id === productId ? { ...i, remark } : i
          ),
        });
      },

      updateQuantity(productId, quantity) {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.product_id === productId
              ? {
                  ...i,
                  quantity: parseFloat(quantity.toFixed(1)),
                  subtotal: parseFloat((quantity * i.price).toFixed(2)),
                }
              : i
          ),
        });
      },

      clearCart() {
        set({ items: [] });
      },

      getTotal() {
        return parseFloat(get().items.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2));
      },

      getItemCount() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },
    }),
    { name: 'cart-storage' }
  )
);

export default useCartStore;
