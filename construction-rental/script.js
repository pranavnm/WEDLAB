/* --- JAVASCRIPT START --- */

/* 
 * 1. DATASET
 */
/* 
 * 1. DATASET - Fetched via API (simulated with JSON file)
 */
let equipmentData = [];

async function fetchEquipmentData() {
    try {
        const response = await fetch('equipment.json');
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        equipmentData = await response.json();
    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error);
        // Fallback data if fetch fails (e.g. if opening file directly without server)
        equipmentData = [];
    }
}

/* 
 * 2. HELPER FUNCTIONS
 */
const formatCurrency = (amount) => {
    return "₹" + amount.toFixed(2);
};

/* 
 * 3. PAGE INITIALIZATION logic
 */
window.addEventListener('DOMContentLoaded', async () => {
    // Fetch data first
    await fetchEquipmentData();

    // Identify page by checking for unique elements
    if (document.getElementById('listings-grid')) {
        initListingsPage();
    } else if (document.getElementById('details-content')) {
        initDetailsPage();
    } else if (document.getElementById('feedback-form')) {
        initFeedbackPage();
    }

    // Modal Logic (Available on Details Page)
    if (document.getElementById('payment-modal')) {
        initPaymentModal();
    }
});


/* 
 * 4. LISTINGS PAGE LOGIC
 */
function initListingsPage() {
    const searchInput = document.getElementById('search-input');
    const categorySelect = document.getElementById('category-filter');
    const sortSelect = document.getElementById('sort-filter');

    // Initial Render
    renderListings();

    // Attach Listeners
    if (searchInput) searchInput.addEventListener('input', renderListings);
    if (categorySelect) categorySelect.addEventListener('change', renderListings);
    if (sortSelect) sortSelect.addEventListener('change', renderListings);
}

function renderListings() {
    const listingsGrid = document.getElementById('listings-grid');
    const searchInput = document.getElementById('search-input');
    const categorySelect = document.getElementById('category-filter');
    const sortSelect = document.getElementById('sort-filter');

    if (!listingsGrid) return;

    let filtered = equipmentData;

    // 1. Search Filter
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    if (query) {
        filtered = filtered.filter(item => item.title.toLowerCase().includes(query));
    }

    // 2. Category Filter
    const category = categorySelect ? categorySelect.value : 'all';
    if (category !== 'all') {
        filtered = filtered.filter(item => item.category === category);
    }

    // 3. Sort
    const sortVal = sortSelect ? sortSelect.value : 'default';
    if (sortVal === 'price-asc') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortVal === 'price-desc') {
        filtered.sort((a, b) => b.price - a.price);
    }

    // Render HTML
    listingsGrid.innerHTML = '';

    if (filtered.length === 0) {
        listingsGrid.innerHTML = '<p>No equipment found matching your criteria.</p>';
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-image-container">
                <img src="${item.image}" alt="${item.title}">
            </div>
            <div class="card-content">
                <span class="tag">${item.category}</span>
                <h3>${item.title}</h3>
                <p style="font-size:0.9rem; color:#666;">${item.specs}</p>
                <div class="card-price">${formatCurrency(item.price)} / day</div>
                ${item.available
                ? `<a href="details.html?id=${item.id}" class="btn">View Details</a>`
                : `<button class="btn" style="background:#ccc; cursor:not-allowed;" disabled>Rented Out</button>`
            }
            </div>
        `;
        listingsGrid.appendChild(card);
    });
}


/* 
 * 5. DETAILS PAGE LOGIC
 */
function initDetailsPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = parseInt(urlParams.get('id'));

    const item = equipmentData.find(i => i.id === id);

    if (item) {
        renderItemDetails(item);
    } else {
        document.getElementById('details-content').innerHTML = `
            <div style="text-align:center; grid-column: 1/-1;">
                <h2>Item not found</h2>
                <a href="listings.html" class="btn">Back to Listings</a>
            </div>
        `;
    }
}

function renderItemDetails(item) {
    const container = document.getElementById('details-content');

    container.innerHTML = `
        <!-- Left Column: Image & Info -->
        <div class="card">
            <img src="${item.image}" alt="${item.title}" style="width:100%; border-radius: var(--border-radius) var(--border-radius) 0 0;">
            <div class="card-content">
                <h2>${item.title}</h2>
                <span class="tag" style="font-size:1rem;">${item.category}</span>
                <p style="margin-top:1rem;">${item.description}</p>
                <ul style="margin-top:1rem; list-style: disc; margin-left: 20px;">
                    <li><strong>Specs:</strong> ${item.specs}</li>
                    <li><strong>Daily Rate:</strong> ${formatCurrency(item.price)}</li>
                    <li><strong>Status:</strong> ${item.available ? '<span style="color:green">Available</span>' : '<span style="color:red">Unavailable</span>'}</li>
                </ul>
            </div>
        </div>

        <!-- Right Column: Booking Form -->
        <div class="booking-form">
            <h3>Book this Equipment</h3>
            <p>Complete the form to reserve now.</p>
            
            <form id="booking-form" onsubmit="handleBooking(event, ${item.id})">
                <div class="form-content">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" required placeholder="name">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="booking-email" required placeholder="example@mail.com">
                    </div>
                    <div class="form-group">
                        <label>Phone Number</label>
                        <input type="tel" id="booking-phone" required placeholder="10 digit Indian phone number" maxlength="10">
                    </div>
                    <div class="form-group">
                        <label>Duration (Days)</label>
                        <input type="number" id="rental-days" min="1" value="1" oninput="calculateTotal(this.value, ${item.price})">
                    </div>

                    <!-- Live Total Calculation -->
                    <div class="total-price" id="total-display">${formatCurrency(item.price)}</div>

                    <button type="submit" class="btn btn-large" style="width:100%">Confirm Booking</button>
                </div>
            </form>
            <div id="booking-success-msg"></div>
        </div>
    `;
}

// Called directly by the form via onsubmit (because it's injected HTML) - but we need to make sure global scope works.
// Better practice in vanilla JS modules is to attach listener after injection, 
// but since we are just in a global script, the global function is fine.
window.calculateTotal = function (days, pricePerDay) {
    const total = days * pricePerDay;
    const display = document.getElementById('total-display');
    if (display) display.textContent = formatCurrency(total);
}

window.handleBooking = function (event, itemId) {
    event.preventDefault();

    const item = equipmentData.find(i => i.id === itemId);
    if (!item) return;

    // Get Values
    const days = document.getElementById('rental-days').value;
    const phoneInput = document.getElementById('booking-phone');
    const emailInput = document.getElementById('booking-email');

    const phone = phoneInput ? phoneInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    // 1. Verify Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Please enter a valid email address.");
        return;
    }

    // 2. Verify an Indian phone number
    // Starts with 6-9, followed by 9 digits
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
        alert("Please enter a valid 10-digit Indian phone number (starting with 6, 7, 8, or 9).");
        return;
    }

    const totalAmount = item.price * days;

    // Open Payment Modal
    openPaymentModal(item, totalAmount, days);
}


/* 
 * 6. FEEDBACK PAGE LOGIC
 */
function initFeedbackPage() {
    renderFeedbackList();

    // Star Rating Logic
    const starContainer = document.getElementById('star-rating-container');
    const ratingInput = document.getElementById('fb-rating');
    const stars = starContainer ? starContainer.querySelectorAll('span') : [];

    if (starContainer && ratingInput) {
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const val = parseInt(star.getAttribute('data-value'));
                ratingInput.value = val;

                // Update visuals
                stars.forEach(s => {
                    const sVal = parseInt(s.getAttribute('data-value'));
                    if (sVal <= val) {
                        s.classList.add('filled');
                    } else {
                        s.classList.remove('filled');
                    }
                });
            });
        });
    }

    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Collect Values
            const name = document.getElementById('fb-name').value;
            const rating = document.getElementById('fb-rating').value;
            const comment = document.getElementById('fb-comment').value;

            const newReview = { name, rating, comment, date: new Date().toLocaleDateString() };

            // Save to LocalStorage
            saveReview(newReview);

            // Update list and clear form
            renderFeedbackList();
            feedbackForm.reset();

            // Reset stars to 5 (default)
            if (ratingInput) ratingInput.value = 5;
            stars.forEach(s => s.classList.add('filled'));

            // Show toast
            const msg = document.getElementById('fb-message');
            msg.innerHTML = '<p class="success-msg">Thank you for your feedback!</p>';
            setTimeout(() => msg.innerHTML = '', 3000);
        });
    }
}

function saveReview(review) {
    const existing = JSON.parse(localStorage.getItem('construction_reviews') || '[]');
    existing.unshift(review);
    localStorage.setItem('construction_reviews', JSON.stringify(existing));
}

function renderFeedbackList() {
    const list = document.getElementById('reviews-list');
    if (!list) return;

    const reviews = JSON.parse(localStorage.getItem('construction_reviews') || '[]');

    if (reviews.length === 0) {
        list.innerHTML = '<p>No reviews yet. Be the first!</p>';
        return;
    }

    list.innerHTML = reviews.map(r => `
        <div class="review-item">
            <strong>${r.name}</strong> 
            <span style="color:var(--primary-color)">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
            <span style="color:#999; font-size:0.8rem; margin-left:10px;">${r.date}</span>
            <p>${r.comment}</p>
        </div>
    `).join('');
}


/* 
 * 7. PAYMENT MODAL LOGIC 
 */
let currentTransaction = null;
let paymentModal;

function initPaymentModal() {
    paymentModal = document.getElementById('payment-modal');
    const closeModal = document.querySelector('.close-modal');
    const paymentForm = document.getElementById('payment-form');

    // Close Modal logic
    if (closeModal) {
        closeModal.onclick = () => { paymentModal.classList.add('hidden'); };
    }

    window.onclick = (event) => {
        if (event.target == paymentModal) {
            paymentModal.classList.add('hidden');
        }
    };

    // Handle Fake Payment Submission
    if (paymentForm) {
        paymentForm.onsubmit = (e) => {
            e.preventDefault();

            const btn = paymentForm.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = "Processing...";
            btn.disabled = true;

            setTimeout(() => {
                paymentModal.classList.add('hidden');
                btn.textContent = originalText;
                btn.disabled = false;
                paymentForm.reset();

                completeBooking(currentTransaction);
            }, 2000);
        };
    }
}

function openPaymentModal(item, total, days) {
    if (!paymentModal) return;

    currentTransaction = { item, total, days };
    const modalTotal = document.getElementById('modal-total-amount');
    if (modalTotal) modalTotal.textContent = formatCurrency(total);
    paymentModal.classList.remove('hidden');
}

function completeBooking(tx) {
    const msgContainer = document.getElementById('booking-success-msg');

    msgContainer.innerHTML = `
        <div class="success-msg">
            <strong>Booking Confirmed!</strong><br>
            Payment ID: MOCK_${Math.floor(Math.random() * 1000000)}<br>
            Booking Confirmed for ${tx.days} days.<br>
            Total Paid: ${formatCurrency(tx.total)}
        </div>
    `;

    // Hide booking form inputs
    const formContent = document.querySelector('#booking-form .form-content');
    if (formContent) formContent.style.display = 'none';
}
