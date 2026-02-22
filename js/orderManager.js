class OrderManager {
  constructor() {
    // Validate Appwrite configuration is available
    if (!window.appwriteConfig) {
      throw new Error(
        "Appwrite configuration not initialized. Make sure appwriteConfig.js is loaded before OrderManager."
      );
    }
    if (!window.databases) {
      throw new Error("Appwrite Databases SDK not initialized.");
    }
    if (!window.ID) {
      throw new Error("Appwrite ID SDK not initialized.");
    }
    if (!window.Query) {
      throw new Error("Appwrite Query SDK not initialized.");
    }

    this.config = window.appwriteConfig;
    this.databases = window.databases;
    this.ID = window.ID;
    this.Query = window.Query;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second

    // OrderManager initialized
  }

  // Retry helper function
  async retryOperation(operation, retries = 0) {
    try {
      return await operation();
    } catch (error) {
      if (retries < this.maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.retryOperation(operation, retries + 1);
      }

      throw error;
    }
  }

  // Create a new order
  async createOrder(orderData) {
    try {
      // Generate unique ID with fallback method (max 20 chars)
      let uniqueOrderId;
      try {
        uniqueOrderId = this.ID.unique();
        if (uniqueOrderId === "unique()") {
          throw new Error("Appwrite ID.unique() not working properly");
        }
      } catch (error) {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.random().toString(36).substr(2, 6);
        uniqueOrderId = timestamp + random;
      }

      const order = {
        // Required orderId field - use the generated ID
        orderId: uniqueOrderId,

        // Required customer field
        customer_id: orderData.customer_id || orderData.buyerId,

        // Order details
        buyerId: orderData.customer_id || orderData.buyerId,
        company_id: orderData.company_id || "",
        branch_id: orderData.branch_id || orderData.branchId,
        deliveryTime: orderData.deliveryTime,
        deliveryDate: orderData.deliveryDate,
        orderComment: orderData.orderComment || "",
        deliveryAddress: orderData.deliveryAddress,
        orderStatus: "pending",
        paymentMethod: orderData.paymentMethod,
        transactionId: orderData.transactionId || "",
        deliveryName: orderData.deliveryName,
        deliveryOrgType: orderData.deliveryOrgType || "",
        total: String(Number(orderData.total || 0).toFixed(2)), // Convert to string with 2 decimals
      };

      const result = await this.databases.createDocument(
        this.config.DATABASE_ID,
        this.config.ORDERS_TABLE,
        uniqueOrderId,
        order
      );

      return result;
    } catch (error) {
      console.error("Error creating order."); // no PII in error log
      throw error;
    }
  }

  // Create purchase recipient information
  async createPurchaseRecipientInfo(orderId, recipientData) {
    try {
      // Validate required fields
      if (!recipientData.recipient_name || !recipientData.recipient_name.trim()) {
        throw new Error('Recipient name is required and cannot be empty');
      }

      if (!recipientData.recipient_phone || !recipientData.recipient_phone.trim()) {
        throw new Error('Recipient phone is required and cannot be empty');
      }

      const recipientInfo = {
        order_id: orderId,
        purchase_recipient_type: recipientData.purchase_recipient_type || "you",
        recipient_name: (recipientData.recipient_name || "").trim(),
        recipient_phone: (recipientData.recipient_phone || "").trim(),
        recipient_email:
          recipientData.recipient_email &&
            recipientData.recipient_email.trim() !== ""
            ? recipientData.recipient_email
            : null,
        recipient_address: recipientData.recipient_address || "",
        recipient_type: recipientData.recipient_type || "",
        business_name: recipientData.business_name || "",
        business_type: recipientData.business_type || "",
        self_pickup: recipientData.self_pickup || false,
        self_delivery_address: recipientData.self_delivery_address || "",
      };

      const result = await this.databases.createDocument(
        this.config.DATABASE_ID,
        this.config.PURCHASE_RECIPIENT_TABLE,
        this.ID.unique(),
        recipientInfo
      );

      return result;
    } catch (error) {
      console.error("Error creating purchase recipient info."); // no PII
      throw error;
    }
  }

  // Create order items for a specific order
  async createOrderItems(orderId, items, orderData) {
    try {
      // Validate that items array is not empty
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('Order items array is empty or invalid');
      }

      const createdItems = [];

      for (const item of items) {
        // Generate unique ID using timestamp and random number as fallback (max 20 chars)
        let uniqueOrderItemId;
        try {
          uniqueOrderItemId = this.ID.unique();
          if (uniqueOrderItemId === "unique()") {
            throw new Error("Appwrite ID.unique() not working properly");
          }
        } catch (error) {
          const timestamp = Date.now().toString().slice(-8);
          const random = Math.random().toString(36).substr(2, 6);
          uniqueOrderItemId = timestamp + random;
        }

        // Get product name with fallbacks
        let productName =
          item.name ||
          item.productName ||
          item.product_name ||
          item.type ||
          "Unknown Product";

        if (!productName || productName === "undefined" || productName.trim() === "") {
          productName = item.type || "Service Product";
        }

        const orderItem = {
          orderItemId: uniqueOrderItemId,
          orderId: orderId,
          branchId:
            orderData.branch_id ||
            orderData.branchId ||
            item.branch_id ||
            item.branchId,
          productId: String(item.productId || item.id || "").substring(0, 20),
          productName: productName,
          productImage: (item.image || item.productImage || "").startsWith(
            "http"
          )
            ? item.image || item.productImage
            : "",
          productType: item.type || item.productType || "default",
          productPrice: Number(item.price || item.productPrice || 0),
          productQty: Number(item.quantity || 1),
          returnStatus: "none",
          returnQty: 0,
          returnComment: "",
        };

        const result = await this.databases.createDocument(
          this.config.DATABASE_ID,
          this.config.ORDER_ITEMS_TABLE,
          uniqueOrderItemId,
          orderItem
        );

        createdItems.push(result);
      }

      return createdItems;
    } catch (error) {
      console.error("Error creating order items."); // no PII
      throw error;
    }
  }

  // Get order by ID
  async getOrder(orderId) {
    try {
      const order = await this.databases.getDocument(
        this.config.DATABASE_ID,
        this.config.ORDERS_TABLE,
        orderId
      );

      // Get order items
      const orderItems = await this.getOrderItems(orderId);

      return { ...order, items: orderItems };
    } catch (error) {
      console.error("Error fetching order.");
      throw error;
    }
  }

  // Get order items for an order
  async getOrderItems(orderId) {
    try {
      // Try multiple common field names to support different schemas
      const candidates = [
        [this.Query.equal("orderId", orderId)],
        [this.Query.equal("order_id", orderId)],
        [this.Query.equal("order", orderId)],
      ];

      for (const filters of candidates) {
        try {
          const items = await this.databases.listDocuments(
            this.config.DATABASE_ID,
            this.config.ORDER_ITEMS_TABLE,
            filters
          );

          if (items && Array.isArray(items.documents) && items.documents.length > 0) {
            // Normalize common fields for consumer code
            return items.documents.map(it => {
              const parsedProduct = (it.product && typeof it.product === 'string') ? (() => {
                try { return JSON.parse(it.product); } catch (e) { return it.product; }
              })() : it.product;

              return {
                ...it,
                productName: it.productName || it.product_name || it.name || (parsedProduct && (parsedProduct.name || parsedProduct.title)) || it.title || null,
                productPrice: it.productPrice || it.product_price || it.price || (parsedProduct && (parsedProduct.price || parsedProduct.unitPrice)) || 0,
                productQty: it.productQty || it.product_qty || it.quantity || it.qty || 1,
                productImage: it.productImage || it.product_image || (parsedProduct && (parsedProduct.image || (parsedProduct.images && parsedProduct.images[0]))) || null,
                productType: it.productType || it.product_type || it.type || (parsedProduct && parsedProduct.type) || 'product'
              };
            });
          }
        } catch (innerErr) {
          devWarn('OrderManager.getOrderItems attempt failed for a filter.');
        }
      }

      // SECURITY FIX (VULN-06): Removed unfiltered bulk fetch of ALL order_items.
      // Always use indexed queries with orderId filter to prevent cross-user data exposure.
      return [];
    } catch (error) {
      console.error("Error fetching order items.");
      throw error;
    }
  }

  // Get orders for a customer
  async getCustomerOrders(customerId) {
    try {
      const orders = await this.databases.listDocuments(
        this.config.DATABASE_ID,
        this.config.ORDERS_TABLE,
        [this.Query.equal("customer_id", customerId)]
      );

      return orders.documents;
    } catch (error) {
      console.error("Error fetching customer orders.");
      throw error;
    }
  }

  // Update order status
  async updateOrderStatus(orderId, status) {
    try {
      const result = await this.databases.updateDocument(
        this.config.DATABASE_ID,
        this.config.ORDERS_TABLE,
        orderId,
        { orderStatus: status }
      );

      devLog('Order status updated.');
      return result;
    } catch (error) {
      console.error("Error updating order status.");
      throw error;
    }
  }

  // Update order with transaction ID
  async updateOrderTransaction(orderId, transactionId) {
    try {
      const result = await this.databases.updateDocument(
        this.config.DATABASE_ID,
        this.config.ORDERS_TABLE,
        orderId,
        { transactionId: transactionId }
      );

      devLog('Order transaction ID updated.');
      return result;
    } catch (error) {
      console.error("Error updating transaction ID.");
      throw error;
    }
  }

  // Delete order (and its items)
  // SECURITY FIX (VULN-08): Requires currentUserId to verify ownership before deletion.
  async deleteOrder(orderId, currentUserId) {
    try {
      // Fetch order first and verify ownership
      const order = await this.databases.getDocument(
        this.config.DATABASE_ID,
        this.config.ORDERS_TABLE,
        orderId
      );
      if (!currentUserId || order.customer_id !== currentUserId) {
        throw new Error('Unauthorized: You do not own this order.');
      }

      // Delete all order items
      const items = await this.getOrderItems(orderId);
      for (const item of items) {
        await this.databases.deleteDocument(
          this.config.DATABASE_ID,
          this.config.ORDER_ITEMS_TABLE,
          item.$id
        );
      }

      // Then delete the order
      await this.databases.deleteDocument(
        this.config.DATABASE_ID,
        this.config.ORDERS_TABLE,
        orderId
      );

      devLog('Order deleted.');
      return true;
    } catch (error) {
      console.error("Error deleting order:", error.message);
      throw error;
    }
  }

  // Validate date/time against working days
  validateDateTimeWithWorkingDays(selectedDate, selectedTime, workingDays) {
    // Handle both array and object formats for workingDays
    let workingDaysArray = [];

    if (Array.isArray(workingDays)) {
      workingDaysArray = workingDays;
    } else if (typeof workingDays === "object" && workingDays !== null) {
      // Convert object format to array format
      workingDaysArray = Object.keys(workingDays).map((day) => ({
        day: day.charAt(0).toUpperCase() + day.slice(1), // Capitalize first letter
        time: `${workingDays[day].open}-${workingDays[day].close}`,
      }));
    }

    if (workingDaysArray.length === 0) {
      return { valid: true, message: "No working days restrictions" };
    }

    const dayOfWeek = new Date(selectedDate).toLocaleDateString("en-US", {
      weekday: "long",
    });
    const workingDay = workingDaysArray.find(
      (day) => day.day.toLowerCase() === dayOfWeek.toLowerCase()
    );

    if (!workingDay) {
      return {
        valid: false,
        message: `Not a working day. ${dayOfWeek} is not available.`,
      };
    }

    // Parse working hours (e.g., "8:00 AM - 6:00 PM")
    const timeRange = workingDay.time;
    const [openTime, closeTime] = timeRange.split(" - ").map((t) => t.trim());

    // Simple time validation (can be enhanced)
    if (selectedTime && openTime && closeTime) {
      // This is basic validation - you might want to improve time comparison
      return { valid: true, message: `Working hours: ${timeRange}` };
    }

    return { valid: true, message: `Working day confirmed: ${dayOfWeek}` };
  }

  // Get saved recipients for a user
  async getSavedRecipients(userId) {
    try {
      // Get favorite recipients (saved with order_id = favorite_<userId>)
      const favoriteResult = await this.databases.listDocuments(
        this.config.DATABASE_ID,
        this.config.PURCHASE_RECIPIENT_TABLE,
        [this.Query.equal("order_id", `favorite_${userId}`)]
      );

      // Transform favorite recipients
      const favoriteRecipients = favoriteResult.documents.map((doc) => ({
        id: doc.$id,
        name: doc.recipient_name,
        phone: doc.recipient_phone,
        email: doc.recipient_email,
        address: doc.recipient_address,
        type: doc.recipient_type,
        businessName: doc.business_name,
        businessType: doc.business_type,
        createdAt: doc.$createdAt,
        isFavorite: true,
      }));

      // Also get recipients from previous orders
      try {
        const ordersResult = await this.databases.listDocuments(
          this.config.DATABASE_ID,
          this.config.ORDERS_TABLE,
          [this.Query.equal("customer_id", userId)]
        );

        if (ordersResult.documents.length > 0) {
          // Get all unique recipient info from these orders
          const recipientPromises = ordersResult.documents.map(
            async (order) => {
              try {
                const recipientResult = await this.databases.listDocuments(
                  this.config.DATABASE_ID,
                  this.config.PURCHASE_RECIPIENT_TABLE,
                  [this.Query.equal("order_id", order.$id)]
                );

                if (recipientResult.documents.length > 0) {
                  const recipient = recipientResult.documents[0];
                  return {
                    id: recipient.$id,
                    name: recipient.recipient_name,
                    phone: recipient.recipient_phone,
                    email: recipient.recipient_email,
                    address: recipient.recipient_address,
                    type: recipient.recipient_type,
                    businessName: recipient.business_name,
                    businessType: recipient.business_type,
                    createdAt: recipient.$createdAt,
                    orderId: order.$id,
                    isFavorite: false,
                  };
                }
                return null;
              } catch (error) {
                devErr('Error fetching recipient for an order.');
                return null;
              }
            }
          );

          const orderRecipients = await Promise.all(recipientPromises);
          const filteredOrderRecipients = orderRecipients.filter(
            (r) => r !== null && r.name
          );

          // Remove duplicates (same name, phone, email)
          const uniqueOrderRecipients = filteredOrderRecipients.reduce(
            (acc, recipient) => {
              const key = `${recipient.name}-${recipient.phone}-${recipient.email}`;
              if (!acc.has(key)) {
                acc.set(key, recipient);
              }
              return acc;
            },
            new Map()
          );

          // Combine favorites and order recipients
          const allRecipients = [
            ...favoriteRecipients,
            ...Array.from(uniqueOrderRecipients.values()),
          ];

          // Final deduplication
          const finalRecipients = allRecipients.reduce((acc, recipient) => {
            const key = `${recipient.name}-${recipient.phone}-${recipient.email}`;
            if (!acc.has(key)) {
              acc.set(key, recipient);
            }
            return acc;
          }, new Map());

          devLog('Final recipients loaded.');
          return Array.from(finalRecipients.values());
        }
      } catch (orderError) {
        devErr('Error fetching order recipients.');
        return favoriteRecipients;
      }

      return favoriteRecipients;
    } catch (error) {
      console.error("Error getting saved recipients.");
      return [];
    }
  }

  // Save recipient to database as favorite
  async saveRecipient(userId, recipientData) {
    try {
      // Create a favorite recipient entry (not tied to an order)
      const document = {
        // Use order_id field to store the user ID for favorite recipients
        order_id: `favorite_${userId}`,
        purchase_recipient_type: recipientData.type,
        recipient_name: recipientData.name,
        recipient_phone: recipientData.phone,
        recipient_email: recipientData.email,
        recipient_address: recipientData.address,
        recipient_type: recipientData.type,
        business_name: recipientData.businessName || "",
        business_type: recipientData.businessType || "",
        self_pickup: recipientData.type === "you",
        self_delivery_address:
          recipientData.type === "you" ? recipientData.address : "",
      };

      const result = await this.databases.createDocument(
        this.config.DATABASE_ID,
        this.config.PURCHASE_RECIPIENT_TABLE,
        this.ID.unique(),
        document
      );

      return result;
    } catch (error) {
      console.error("Error saving recipient.");
      throw error;
    }
  }

  // Delete saved recipient
  // SECURITY FIX (VULN-08): Requires currentUserId to verify ownership before deletion.
  async deleteRecipient(recipientId, currentUserId) {
    try {
      // Fetch document first and verify it belongs to this user
      const doc = await this.databases.getDocument(
        this.config.DATABASE_ID,
        this.config.PURCHASE_RECIPIENT_TABLE,
        recipientId
      );
      // Favorites use order_id = 'favorite_<userId>'. Reject if mismatch.
      if (!currentUserId || doc.order_id !== `favorite_${currentUserId}`) {
        throw new Error('Unauthorized: You do not own this recipient record.');
      }
      await this.databases.deleteDocument(
        this.config.DATABASE_ID,
        this.config.PURCHASE_RECIPIENT_TABLE,
        recipientId
      );
      return true;
    } catch (error) {
      console.error("Error deleting recipient:", error.message);
      throw error;
    }
  }

  // Complete order creation with validation
  async createCompleteOrder(orderData, cartItems, workingDays) {
    try {
      // Validate date/time
      const validation = this.validateDateTimeWithWorkingDays(
        orderData.deliveryDate,
        orderData.deliveryTime,
        workingDays
      );

      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Create order
      const order = await this.createOrder(orderData);

      // Create order items
      await this.createOrderItems(order.$id, cartItems, orderData);

      devLog('Complete order created successfully.');
      return order;
    } catch (error) {
      console.error("Error creating complete order.");
      throw error;
    }
  }

  // Get orders by customer ID
  async getOrdersByCustomer(customerId) {
    const operation = async () => {
      const result = await this.databases.listDocuments(
        this.config.DATABASE_ID,
        this.config.ORDERS_TABLE,
        [Query.equal("customer_id", customerId), Query.orderDesc("$createdAt")]
      );

      return result.documents;
    };

    try {
      return await this.retryOperation(operation);
    } catch (error) {
      console.error("Error getting orders after retries.");
      return [];
    }
  }

  // Get order items for an order
  async getOrderItems(orderId) {
    const operation = async () => {
      const result = await this.databases.listDocuments(
        this.config.DATABASE_ID,
        this.config.ORDER_ITEMS_TABLE,
        [Query.equal("orderId", orderId)]
      );

      return result.documents;
    };

    try {
      return await this.retryOperation(operation);
    } catch (error) {
      console.error("Error getting order items after retries.");
      return [];
    }
  }

  // Get purchase recipient info for an order
  async getPurchaseRecipientInfo(orderId) {
    const operation = async () => {
      const result = await this.databases.listDocuments(
        this.config.DATABASE_ID,
        this.config.PURCHASE_RECIPIENT_TABLE,
        [Query.equal("order_id", orderId)]
      );

      return result.documents.length > 0 ? result.documents[0] : null;
    };

    try {
      return await this.retryOperation(operation);
    } catch (error) {
      // If it's a permission error, just return null and continue
      if (
        error.message.includes("not authorized") ||
        error.message.includes("401")
      ) {
        return null;
      }
      return null;
    }
  }
}

// Make OrderManager globally available
window.OrderManager = OrderManager;
