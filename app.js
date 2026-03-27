const API_URL = 'http://208.76.40.112:3346'; // Ganti dengan URL backend Anda

// Helper functions
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong');
        }
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message);
        throw error;
    }
}

// Cart functions
async function addToCart(productId, quantity = 1, notes = '') {
    const user = localStorage.getItem('ruxx_user');
    if (!user) {
        showToast('Silakan login terlebih dahulu');
        window.location.href = 'login.html';
        return false;
    }
    
    const userData = JSON.parse(user);
    
    // Check stock first
    const stockCheck = await apiCall(`/api/products/stock/${productId}`);
    if (!stockCheck.available) {
        showToast('MOHON MAAF BARANG SEDANG HABIS');
        return false;
    }
    
    await apiCall('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({
            userId: userData.id,
            productId,
            quantity,
            notes
        })
    });
    
    showToast('Berhasil ditambahkan ke keranjang');
    return true;
}

// OTP handling with cooldown
let otpCooldown = 0;
let otpAttempts = 0;

async function requestOTP(phone) {
    const cooldowns = [0, 30000, 60000, 150000, 300000];
    
    if (otpCooldown > Date.now()) {
        const remaining = Math.ceil((otpCooldown - Date.now()) / 1000);
        showToast(`Mohon tunggu ${remaining} detik sebelum meminta OTP lagi`);
        return false;
    }
    
    try {
        await apiCall('/api/user/otp/request', {
            method: 'POST',
            body: JSON.stringify({ phone })
        });
        
        otpAttempts++;
        const cooldownTime = cooldowns[Math.min(otpAttempts, cooldowns.length - 1)];
        otpCooldown = Date.now() + cooldownTime;
        
        showToast('OTP telah dikirim ke Telegram Anda');
        return true;
    } catch (error) {
        showToast('Gagal mengirim OTP');
        return false;
    }
}

// Payment handling
async function createPayment(userId, paymentMethod, notes, emailOrTelegram) {
    const order = await apiCall('/api/order/create', {
        method: 'POST',
        body: JSON.stringify({
            userId,
            paymentMethod,
            notes,
            emailOrTelegram
        })
    });
    
    return order;
}

// Check payment status
async function checkPaymentStatus(orderId) {
    const status = await apiCall(`/api/order/status/${orderId}`);
    return status;
}

// Load product details
async function loadProductDetails(productId) {
    const product = await apiCall(`/api/products/${productId}`);
    return product;
}

// Load user orders
async function loadUserOrders(userId) {
    const orders = await apiCall(`/api/orders/${userId}`);
    return orders;
}

// Add note to order
async function addOrderNote(userId, orderId, note) {
    await apiCall('/api/notes/add', {
        method: 'POST',
        body: JSON.stringify({ userId, orderId, note })
    });
}

// Remove note
async function removeOrderNote(userId, orderId) {
    await apiCall(`/api/notes/remove/${userId}/${orderId}`, {
        method: 'DELETE'
    });
}

// Export functions for global use
window.ruxxStore = {
    addToCart,
    requestOTP,
    createPayment,
    checkPaymentStatus,
    loadProductDetails,
    loadUserOrders,
    addOrderNote,
    removeOrderNote,
    showToast
};