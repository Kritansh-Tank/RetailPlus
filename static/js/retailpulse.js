/**
 * RetailPlus - Main JavaScript
 * This file handles all interactive functionality for the RetailPlus platform
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');
    
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Animate stat counters when they come into view
    animateStatCounters();
    
    // Set up tab navigation
    setupTabNavigation();
    
    // Setup form submissions
    setupFormSubmissions();
    
    // Set up forecast chart container
    setupChartContainers();
    
    // Initialize charts if their containers exist
    // Wait a short time to ensure Chart.js is loaded
    setTimeout(function() {
        console.log('Initializing charts');
        initializeCharts();
    }, 500);
    
    // Setup inventory status indicators
    setupInventoryStatus();
    
    // Add click handlers for refresh buttons
    setupRefreshButtons();
    
    // Check API health on load
    checkApiHealth();
});

/**
 * Check API health
 */
function checkApiHealth() {
    fetch('/api/health')
        .then(response => response.json())
        .then(data => {
            console.log('API Health:', data);
        })
        .catch(error => {
            console.error('API Health Check Error:', error);
        });
}

/**
 * Load data from API
 * @param {string} endpoint - API endpoint to fetch
 * @param {Object} params - Query parameters
 * @returns {Promise} - Promise resolving to API response
 */
async function fetchAPI(endpoint, params = {}) {
    try {
        const method = params.method || 'GET';
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const options = {
            method,
            headers
        };
        
        if (method === 'POST' && params.body) {
            options.body = JSON.stringify(params.body);
        }
        
        let url = endpoint;
        if (method === 'GET' && params.queryParams) {
            const queryString = new URLSearchParams(params.queryParams).toString();
            url = `${endpoint}?${queryString}`;
        }
        
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Format product name based on ID
 * @param {string|number} productId - Product ID
 * @returns {string} - Formatted product name
 */
function formatProductName(productId) {
    // This is a placeholder - in a real application, you'd fetch actual product names
    const productCategories = {
        '1': 'Fresh Produce',
        '2': 'Bakery',
        '3': 'Dairy',
        '4': 'Meat',
        '5': 'Seafood',
        '6': 'Frozen Foods',
        '7': 'Beverages',
        '8': 'Snacks',
        '9': 'Personal Care'
    };
    
    const firstDigit = String(productId).charAt(0);
    const category = productCategories[firstDigit] || 'General Merchandise';
    
    return `${category} #${productId}`;
}

/**
 * Format currency value
 * @param {number} value - Value to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(value);
}

/**
 * Format trend indicator
 * @param {number} value - Value to check for trend
 * @returns {string} - HTML for trend indicator
 */
function formatTrend(value) {
    if (value > 0) {
        return `<i class="bi bi-arrow-up-right text-success"></i> +${value}%`;
    } else if (value < 0) {
        return `<i class="bi bi-arrow-down-right text-danger"></i> ${value}%`;
    } else {
        return `<i class="bi bi-dash text-secondary"></i> 0%`;
    }
}

/**
 * Handle API errors
 * @param {Error} error - Error object
 * @param {string} containerId - ID of container to show error
 */
function handleApiError(error, containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i> 
                Error: ${error.message || 'Unknown error occurred'}
            </div>
        `;
    }
    console.error('API Error:', error);
}

/**
 * Animate the statistic counters with a counting up effect
 */
function animateStatCounters() {
    const counters = document.querySelectorAll('.stat-value');
    
    // Fetch dashboard statistics (or use defaults if API doesn't exist)
    fetchAPI('/api/dashboard-stats')
        .then(response => {
            if (response.status === 'success') {
                // Update data-target attributes with real data
                const stats = response.data;
                counters.forEach(counter => {
                    const statType = counter.parentElement.querySelector('.stat-label').textContent.trim().toLowerCase();
                    
                    if (statType.includes('product')) {
                        counter.setAttribute('data-target', stats.total_products || 1247);
                    } else if (statType.includes('store')) {
                        counter.setAttribute('data-target', stats.total_stores || 86);
                    } else if (statType.includes('critical')) {
                        counter.setAttribute('data-target', stats.critical_items || 42);
                    } else if (statType.includes('accuracy')) {
                        counter.setAttribute('data-target', stats.optimization_accuracy || 94);
                    }
                });
            }
            
            // Animate the counters regardless of whether we got real data
            animateCounters(counters);
        })
        .catch(() => {
            // If API fails, just animate with existing values
            animateCounters(counters);
        });
}

/**
 * Animate counter elements
 * @param {NodeList} counters - Counter elements to animate
 */
function animateCounters(counters) {
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        const duration = 1500; // Duration in milliseconds
        const stepTime = Math.abs(Math.floor(duration / target)) || 10;
        
        let current = 0;
        const step = target / 100;
        
        const timer = setInterval(() => {
            current += step;
            counter.textContent = Math.round(current);
            
            if (current >= target) {
                counter.textContent = target;
                clearInterval(timer);
            }
        }, stepTime);
    });
}

/**
 * Setup tab navigation functionality
 */
function setupTabNavigation() {
    const tabLinks = document.querySelectorAll('.tab-retailpulse .nav-link');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the target from data-bs-target attribute
            const targetId = this.getAttribute('data-bs-target');
            
            // Remove active class from all tabs
            tabLinks.forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show the corresponding tab content
            const tabContents = document.querySelectorAll('.tab-pane');
            
            tabContents.forEach(content => {
                content.classList.remove('show', 'active');
            });
            
            const targetContent = document.querySelector(targetId);
            if (targetContent) {
                targetContent.classList.add('show', 'active');
            }
        });
    });
}

/**
 * Setup form submissions with AJAX
 */
function setupFormSubmissions() {
    // Optimize form submission
    const optimizeForm = document.getElementById('optimizeForm');
    if (optimizeForm) {
        optimizeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const productId = document.getElementById('productId').value;
            const storeId = document.getElementById('storeId').value;
            
            if (!productId || !storeId) {
                alert('Please enter both Product ID and Store ID');
                return;
            }
            
            // Show spinner
            const submitBtn = optimizeForm.querySelector('button[type="submit"]');
            const spinner = document.getElementById('optimizeSpinner');
            const resultContainer = document.getElementById('optimizeResult');
            
            submitBtn.disabled = true;
            spinner.style.display = 'inline-block';
            resultContainer.innerHTML = '<div class="alert alert-info"><i class="bi bi-hourglass-split me-2"></i> Processing optimization request...</div>';
            
            // Call the API endpoint
            fetchAPI('/api/optimize', {
                method: 'POST',
                body: {
                    product_id: productId,
                    store_id: storeId
                }
            })
            .then(response => {
                if (response.status === 'success') {
                    const plan = response.data.optimization_plan;
                    
                    // Format the response in a readable way
                    let html = '<div class="alert alert-success"><i class="bi bi-check-circle-fill me-2"></i> Optimization complete!</div>';
                    
                    // Add warning if using fallback data
                    if (response.status === "warning") {
                        html += `<div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i> 
                            ${response.message || "Using pre-calculated optimization plan due to AI service limitations."}
                        </div>`;
                    }
                    
                    html += `<div class="optimization-result">`;
                    
                    // Process demand forecast
                    if (plan.demand_forecast) {
                        const content = typeof plan.demand_forecast === 'object' 
                            ? `<pre class="json-output">${JSON.stringify(plan.demand_forecast, null, 2)}</pre>`
                            : `<p>${plan.demand_forecast}</p>`;
                            
                        html += `<div class="result-section">
                            <h6><i class="bi bi-graph-up"></i> Demand Forecast</h6>
                            ${content}
                        </div>`;
                    }
                    
                    // Process optimal inventory level
                    if (plan.optimal_inventory_level) {
                        const content = typeof plan.optimal_inventory_level === 'object' 
                            ? `<pre class="json-output">${JSON.stringify(plan.optimal_inventory_level, null, 2)}</pre>`
                            : `<p>${plan.optimal_inventory_level}</p>`;
                            
                        html += `<div class="result-section">
                            <h6><i class="bi bi-box-seam"></i> Optimal Inventory Level</h6>
                            ${content}
                        </div>`;
                    }
                    
                    // Process pricing strategy
                    if (plan.pricing_strategy) {
                        const content = typeof plan.pricing_strategy === 'object' 
                            ? `<pre class="json-output">${JSON.stringify(plan.pricing_strategy, null, 2)}</pre>`
                            : `<p>${plan.pricing_strategy}</p>`;
                            
                        html += `<div class="result-section">
                            <h6><i class="bi bi-tag"></i> Pricing Strategy</h6>
                            ${content}
                        </div>`;
                    }
                    
                    // Process order recommendations
                    if (plan.order_recommendations) {
                        const content = typeof plan.order_recommendations === 'object' 
                            ? `<pre class="json-output">${JSON.stringify(plan.order_recommendations, null, 2)}</pre>`
                            : `<p>${plan.order_recommendations}</p>`;
                            
                        html += `<div class="result-section">
                            <h6><i class="bi bi-truck"></i> Order Recommendations</h6>
                            ${content}
                        </div>`;
                    }
                    
                    // Process key actions
                    if (plan.key_actions) {
                        // Always treat key_actions as a string to be displayed as-is
                        const content = `<p>${plan.key_actions}</p>`;
                        
                        html += `<div class="result-section">
                            <h6><i class="bi bi-list-check"></i> Key Actions</h6>
                            ${content}
                        </div>`;
                    }
                    
                    // Process projected impact
                    if (plan.projected_impact && typeof plan.projected_impact === 'object') {
                        html += `<div class="result-section">
                            <h6><i class="bi bi-graph-up-arrow"></i> Projected Impact</h6>
                            <div class="row">
                                ${plan.projected_impact.revenue ? `<div class="col-md-3 col-sm-6">
                                    <div class="impact-metric">
                                        <div class="metric-label">Revenue</div>
                                        <div class="metric-value text-success">${plan.projected_impact.revenue}</div>
                                    </div>
                                </div>` : ''}
                                
                                ${plan.projected_impact.costs ? `<div class="col-md-3 col-sm-6">
                                    <div class="impact-metric">
                                        <div class="metric-label">Costs</div>
                                        <div class="metric-value text-danger">${plan.projected_impact.costs}</div>
                                    </div>
                                </div>` : ''}
                                
                                ${plan.projected_impact.profit_margin ? `<div class="col-md-3 col-sm-6">
                                    <div class="impact-metric">
                                        <div class="metric-label">Profit Margin</div>
                                        <div class="metric-value ${parseFloat(plan.projected_impact.profit_margin) >= 0 ? 'text-success' : 'text-danger'}">${plan.projected_impact.profit_margin}</div>
                                    </div>
                                </div>` : ''}
                                
                                ${plan.projected_impact.stockout_risk ? `<div class="col-md-3 col-sm-6">
                                    <div class="impact-metric">
                                        <div class="metric-label">Stockout Risk</div>
                                        <div class="metric-value text-info">${plan.projected_impact.stockout_risk}</div>
                                    </div>
                                </div>` : ''}
                            </div>
                        </div>`;
                    }
                    
                    html += `</div>`;
                    
                    resultContainer.innerHTML = html;
                } else {
                    handleApiError(new Error(response.message || 'Optimization failed'), 'optimizeResult');
                }
            })
            .catch(error => {
                handleApiError(error, 'optimizeResult');
            })
            .finally(() => {
                submitBtn.disabled = false;
                spinner.style.display = 'none';
            });
        });
    }
    
    // Forecast form submission
    const forecastForm = document.getElementById('forecastForm');
    if (forecastForm) {
        forecastForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const productId = document.getElementById('forecastProductId').value;
            const storeId = document.getElementById('forecastStoreId').value;
            const daysAhead = document.getElementById('daysAhead').value;
            
            if (!productId || !storeId) {
                alert('Please enter both Product ID and Store ID');
                return;
            }
            
            // Show spinner
            const submitBtn = forecastForm.querySelector('button[type="submit"]');
            const spinner = document.getElementById('forecastSpinner');
            const resultContainer = document.getElementById('forecastResult');
            
            submitBtn.disabled = true;
            spinner.style.display = 'inline-block';
            resultContainer.innerHTML = '<div class="alert alert-info"><i class="bi bi-hourglass-split me-2"></i> Processing forecast request...</div>';
            
            // Create or ensure the chart container exists
            let chartContainer = document.getElementById('forecast-chart');
            if (!chartContainer) {
                console.log("Creating new forecast chart container");
                chartContainer = document.createElement('div');
                chartContainer.id = 'forecast-chart';
                chartContainer.className = 'chart-container mt-4';
                chartContainer.style.display = 'none';
                resultContainer.parentNode.insertBefore(chartContainer, resultContainer.nextSibling);
            } else {
                console.log("Reusing existing forecast chart container");
                // Reset the container for a new chart
                chartContainer.style.display = 'none';
                // We'll keep the container's contents as is - the renderForecastChartWithData function
                // will handle clearing and recreating the canvas
            }
            
            // Show loading message in the chart container
            chartContainer.innerHTML = `
                <div class="d-flex justify-content-center align-items-center p-5">
                    <div class="spinner-border text-primary me-3"></div>
                    <span>Preparing forecast chart...</span>
                </div>
            `;
            
            // Call the API endpoint
            fetchAPI('/api/forecast', {
                method: 'POST',
                body: {
                    product_id: productId,
                    store_id: storeId,
                    days_ahead: parseInt(daysAhead)
                }
            })
            .then(response => {
                console.log("Forecast API Response:", response);
                if (response.status === 'success') {
                    const forecast = response.data.forecast;
                    console.log("Forecast data:", forecast);
                    
                    // Display success message
                    let summaryText = '';
                    if (forecast.summary) {
                        summaryText = forecast.summary;
                    } else if (forecast.explanation) {
                        summaryText = forecast.explanation;
                    } else if (typeof forecast === 'object') {
                        summaryText = `Forecast generated for Product ${productId} at Store ${storeId} for the next ${daysAhead} days.`;
                    }
                    
                    resultContainer.innerHTML = `
                        <div class="alert alert-success">
                            <i class="bi bi-check-circle-fill me-2"></i> Forecast generated successfully!
                        </div>
                        <div class="forecast-summary">
                            <p><strong>Product ID:</strong> ${productId}</p>
                            <p><strong>Store ID:</strong> ${storeId}</p>
                            <p><strong>Forecast Period:</strong> ${daysAhead} days</p>
                            <p>${summaryText}</p>
                        </div>
                    `;
                    
                    // Make chart container visible
                    chartContainer.style.display = 'block';
                    
                    // Prepare and render forecast chart
                    renderForecastChartWithData(forecast);
                } else {
                    handleApiError(new Error(response.message || 'Forecast failed'), 'forecastResult');
                }
            })
            .catch(error => {
                console.error("Forecast API Error:", error);
                handleApiError(error, 'forecastResult');
            })
            .finally(() => {
                submitBtn.disabled = false;
                spinner.style.display = 'none';
            });
        });
    }
    
    // Inventory check form submission
    const inventoryForm = document.getElementById('inventoryForm');
    if (inventoryForm) {
        inventoryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const productId = document.getElementById('inventoryProductId').value;
            const storeId = document.getElementById('inventoryStoreId').value;
            
            if (!productId || !storeId) {
                alert('Please enter both Product ID and Store ID');
                return;
            }
            
            // Show spinner
            const submitBtn = inventoryForm.querySelector('button[type="submit"]');
            const spinner = document.getElementById('inventorySpinner');
            const resultContainer = document.getElementById('inventoryResult');
            
            submitBtn.disabled = true;
            spinner.style.display = 'inline-block';
            resultContainer.innerHTML = '<div class="alert alert-info"><i class="bi bi-hourglass-split me-2"></i> Checking inventory status...</div>';
            
            // Call the API endpoint
            fetchAPI('/api/inventory-status', {
                method: 'POST',
                body: {
                    product_id: productId,
                    store_id: storeId
                }
            })
            .then(response => {
                if (response.status === 'success') {
                    const status = response.data.inventory_status;
                    
                    // Format the status as a table
                    let html = `
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Product ID</th>
                                        <th>Store ID</th>
                                        <th>Current Level</th>
                                        <th>Reorder Point</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>${productId}</td>
                                        <td>${storeId}</td>
                                        <td>${status.current_stock || 'N/A'} units</td>
                                        <td>${status.reorder_point || 'N/A'}</td>
                                        <td><span class="badge ${getStatusBadgeClass(status.status_code || '')}">${status.status || 'Unknown'}</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    `;
                    
                    if (status.details) {
                        html += `
                            <div class="inventory-details mt-3">
                                <h6>Additional Details:</h6>
                                <p>${status.details}</p>
                            </div>
                        `;
                    }
                    
                    if (status.recommendations) {
                        html += `
                            <div class="inventory-recommendations mt-3">
                                <h6>Recommendations:</h6>
                                <p>${status.recommendations}</p>
                            </div>
                        `;
                    }
                    
                    resultContainer.innerHTML = html;
                } else {
                    handleApiError(new Error(response.message || 'Inventory check failed'), 'inventoryResult');
                }
            })
            .catch(error => {
                handleApiError(error, 'inventoryResult');
            })
            .finally(() => {
                submitBtn.disabled = false;
                spinner.style.display = 'none';
            });
        });
    }
    
    // Pricing optimization form submission
    const pricingForm = document.getElementById('pricingForm');
    if (pricingForm) {
        pricingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const productId = document.getElementById('pricingProductId').value;
            const storeId = document.getElementById('pricingStoreId').value;
            
            if (!productId || !storeId) {
                alert('Please enter both Product ID and Store ID');
                return;
            }
            
            // Show spinner
            const submitBtn = pricingForm.querySelector('button[type="submit"]');
            const spinner = document.getElementById('pricingSpinner');
            const resultContainer = document.getElementById('pricingResult');
            
            submitBtn.disabled = true;
            spinner.style.display = 'inline-block';
            resultContainer.innerHTML = '<div class="alert alert-info"><i class="bi bi-hourglass-split me-2"></i> Optimizing pricing...</div>';
            
            // Call the API endpoint
            fetchAPI('/api/pricing', {
                method: 'POST',
                body: {
                    product_id: productId,
                    store_id: storeId
                }
            })
            .then(response => {
                console.log("Pricing API Response:", response);
                if (response.status === 'success') {
                    const recommendations = response.data.pricing_recommendations;
                    console.log("Pricing recommendations:", recommendations);
                    
                    // Format the recommendations
                    let html = `<div class="alert alert-success"><i class="bi bi-check-circle-fill me-2"></i> Pricing optimization complete!</div>`;
                    
                    html += `<div class="pricing-result">`;
                    
                    // Optimal price
                    if (recommendations.optimal_price) {
                        html += `
                            <div class="result-section">
                                <h6><i class="bi bi-tag"></i> Optimal Price</h6>
                                <p class="fw-bold fs-4 text-success">${recommendations.optimal_price}</p>
                            </div>
                        `;
                    }
                    
                    // Recommended discount
                    if (recommendations.recommended_discount_percentage) {
                        html += `
                            <div class="result-section">
                                <h6><i class="bi bi-percent"></i> Recommended Discount</h6>
                                <p class="fw-bold">${recommendations.recommended_discount_percentage}</p>
                            </div>
                        `;
                    }
                    
                    // Price elasticity
                    if (recommendations.elasticity_assessment) {
                        html += `
                            <div class="result-section">
                                <h6><i class="bi bi-graph-up"></i> Price Elasticity Assessment</h6>
                                <p>${recommendations.elasticity_assessment}</p>
                            </div>
                        `;
                    }
                    
                    // Expected impacts
                    html += `<div class="row">`;
                    
                    if (recommendations.expected_sales_impact) {
                        html += `
                            <div class="col-md-6">
                                <div class="result-section">
                                    <h6><i class="bi bi-cart"></i> Expected Sales Impact</h6>
                                    <p>${recommendations.expected_sales_impact}</p>
                                </div>
                            </div>
                        `;
                    }
                    
                    if (recommendations.expected_profit_impact) {
                        html += `
                            <div class="col-md-6">
                                <div class="result-section">
                                    <h6><i class="bi bi-cash-coin"></i> Expected Profit Impact</h6>
                                    <p>${recommendations.expected_profit_impact}</p>
                                </div>
                            </div>
                        `;
                    }
                    
                    html += `</div></div>`;
                    
                    resultContainer.innerHTML = html;
                } else {
                    handleApiError(new Error(response.message || 'Pricing optimization failed'), 'pricingResult');
                }
            })
            .catch(error => {
                console.error("Pricing API Error:", error);
                handleApiError(error, 'pricingResult');
            })
            .finally(() => {
                submitBtn.disabled = false;
                spinner.style.display = 'none';
            });
        });
    }
    
    // Supply Chain form submission
    const supplyChainForm = document.getElementById('supplyChainForm');
    if (supplyChainForm) {
        supplyChainForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const productId = document.getElementById('supplyChainProductId').value;
            const storeId = document.getElementById('supplyChainStoreId').value;
            
            if (!productId || !storeId) {
                alert('Please enter both Product ID and Store ID');
                return;
            }
            
            // Show spinner
            const submitBtn = supplyChainForm.querySelector('button[type="submit"]');
            const spinner = document.getElementById('supplyChainSpinner');
            const resultContainer = document.getElementById('supplyChainResult');
            
            submitBtn.disabled = true;
            spinner.style.display = 'inline-block';
            resultContainer.innerHTML = '<div class="alert alert-info"><i class="bi bi-hourglass-split me-2"></i> Generating supply chain recommendations...</div>';
            
            // Call the API endpoint
            fetchAPI('/api/supply-chain', {
                method: 'POST',
                body: {
                    product_id: productId,
                    store_id: storeId
                }
            })
            .then(response => {
                console.log("Supply Chain API Response:", response);
                if (response.status === 'success') {
                    const recommendations = response.data.supply_chain_recommendations;
                    console.log("Supply Chain recommendations:", recommendations);
                    
                    // Format the recommendations
                    let html = `<div class="alert alert-success"><i class="bi bi-check-circle-fill me-2"></i> Supply chain recommendations generated!</div>`;
                    
                    html += `<div class="supply-chain-result">`;
                    
                    // Order quantity
                    if (recommendations.optimal_order_quantity) {
                        html += `
                            <div class="result-section">
                                <h6><i class="bi bi-box-seam"></i> Optimal Order Quantity</h6>
                                <p class="fw-bold fs-4">${recommendations.optimal_order_quantity}</p>
                            </div>
                        `;
                    }
                    
                    // Order frequency
                    if (recommendations.recommended_order_frequency_days) {
                        html += `
                            <div class="result-section">
                                <h6><i class="bi bi-calendar"></i> Recommended Order Frequency</h6>
                                <p>Every ${recommendations.recommended_order_frequency_days} days</p>
                            </div>
                        `;
                    }
                    
                    // Supplier performance
                    if (recommendations.supplier_performance) {
                        html += `
                            <div class="result-section">
                                <h6><i class="bi bi-truck"></i> Supplier Performance</h6>
                                <p>${recommendations.supplier_performance}</p>
                            </div>
                        `;
                    }
                    
                    // Warehouse capacity
                    if (recommendations.warehouse_capacity_status) {
                        html += `
                            <div class="result-section">
                                <h6><i class="bi bi-building"></i> Warehouse Capacity Status</h6>
                                <p>${recommendations.warehouse_capacity_status}</p>
                            </div>
                        `;
                    }
                    
                    // Recommended actions
                    if (recommendations.recommended_actions && recommendations.recommended_actions.length > 0) {
                        html += `
                            <div class="result-section">
                                <h6><i class="bi bi-list-check"></i> Recommended Actions</h6>
                                <ul class="list-group">
                        `;
                        
                        recommendations.recommended_actions.forEach(action => {
                            html += `<li class="list-group-item">${action}</li>`;
                        });
                        
                        html += `
                                </ul>
                            </div>
                        `;
                    }
                    
                    html += `</div>`;
                    
                    resultContainer.innerHTML = html;
                } else {
                    handleApiError(new Error(response.message || 'Supply chain recommendations failed'), 'supplyChainResult');
                }
            })
            .catch(error => {
                console.error("Supply Chain API Error:", error);
                handleApiError(error, 'supplyChainResult');
            })
            .finally(() => {
                submitBtn.disabled = false;
                spinner.style.display = 'none';
            });
        });
    }
}

/**
 * Get appropriate badge class for status
 * @param {string} statusCode - Status code
 * @returns {string} - CSS class for badge
 */
function getStatusBadgeClass(statusCode) {
    switch(statusCode.toLowerCase()) {
        case 'critical':
        case 'out_of_stock':
            return 'bg-danger';
        case 'low':
            return 'bg-warning';
        case 'adequate':
        case 'optimal':
            return 'bg-success';
        case 'overstock':
            return 'bg-info';
        default:
            return 'bg-secondary';
    }
}

/**
 * Initialize charts 
 */
function initializeCharts() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js is not loaded, waiting for it to load...');
        // Try again in 500ms to see if Chart.js has loaded
        setTimeout(initializeCharts, 500);
        return;
    }
    
    console.log('Chart.js loaded successfully, version:', Chart.version);
    
    // Set up Chart.js global defaults
    Chart.defaults.font.family = "'Poppins', sans-serif";
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = true;
    
    // Hide the forecast chart container initially
    const forecastChartContainer = document.getElementById('forecast-chart');
    if (forecastChartContainer) {
        console.log('Setting up forecast chart container initial state');
        forecastChartContainer.style.display = 'none';
    }
    
    // Initialize other charts if needed
    // For example, trend chart on dashboard
    initializeTrendChart();
}

/**
 * Initialize trend chart on dashboard
 */
function initializeTrendChart() {
    const trendChartEl = document.getElementById('trendChart');
    if (!trendChartEl) return;
    
    // First show a loading message
    trendChartEl.innerHTML = '<div class="d-flex justify-content-center align-items-center" style="height: 300px;"><div class="spinner-border text-primary"></div></div>';
    
    // Load trend data from API (using sample sales data)
    fetchAPI('/api/top-products', {
        queryParams: { limit: 20 }
    })
    .then(response => {
        if (response.status === 'success') {
            // Process the data for visualization
            const monthlyData = processMonthlyTrends(response.data);
            
            // Now create the canvas and chart
            trendChartEl.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.id = 'sales-inventory-trends';
            trendChartEl.appendChild(canvas);
            
            // Create the chart
            const ctx = canvas.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: monthlyData.labels,
                    datasets: [
                        {
                            label: 'Sales',
                            data: monthlyData.sales,
                            borderColor: 'rgba(63, 81, 181, 0.8)',
                            backgroundColor: 'rgba(63, 81, 181, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Inventory',
                            data: monthlyData.inventory,
                            borderColor: 'rgba(255, 64, 129, 0.8)',
                            backgroundColor: 'rgba(255, 64, 129, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Sales (units)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Inventory (units)'
                            },
                            grid: {
                                drawOnChartArea: false,
                            }
                        }
                    }
                }
            });
        } else {
            trendChartEl.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Could not load trend data: ${response.message || 'Unknown error'}
                </div>
            `;
        }
    })
    .catch(error => {
        trendChartEl.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Error loading trend data: ${error.message}
            </div>
        `;
    });
}

/**
 * Process API data into monthly trends
 * @param {Array} data - API data
 * @returns {Object} - Processed data for chart
 */
function processMonthlyTrends(data) {
    // For demo purposes, generate mock monthly data
    // In a real implementation, this would aggregate actual data by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Generate some derived values based on the actual data
    const totalSales = data.reduce((sum, item) => sum + (parseInt(item.total_sales) || 0), 0);
    const avgSalesPerMonth = totalSales / 12;
    
    // Create trend patterns with variations
    const sales = months.map((_, i) => {
        // Create a seasonal pattern with some randomness
        const seasonalFactor = 1 + 0.3 * Math.sin(i * Math.PI / 6);
        return Math.round(avgSalesPerMonth * seasonalFactor * (0.9 + Math.random() * 0.2));
    });
    
    // Inventory usually moves in opposite direction to sales
    const inventory = months.map((_, i) => {
        // Inventory tends to be higher when sales are lower
        const base = avgSalesPerMonth * 0.5;
        const seasonalFactor = 1 - 0.3 * Math.sin(i * Math.PI / 6);
        return Math.round(base * seasonalFactor * (0.9 + Math.random() * 0.2));
    });
    
    return {
        labels: months,
        sales: sales,
        inventory: inventory
    };
}

/**
 * Render forecast chart with data from API
 * @param {Object} forecastData - Forecast data from API
 */
function renderForecastChartWithData(forecastData) {
    const chartContainer = document.getElementById('forecast-chart');
    if (!chartContainer) return;
    
    console.log("Forecast data received:", forecastData);
    
    // Get existing canvas or create one if it doesn't exist
    let canvas = document.getElementById('demand-forecast-chart');
    let existingChart;
    
    // Check if there's an existing chart and destroy it properly
    if (canvas) {
        existingChart = Chart.getChart(canvas);
        if (existingChart) {
            console.log("Destroying existing chart");
            existingChart.destroy();
            // After destroying, we'll recreate a fresh canvas to avoid any potential issues
            canvas.remove();
        }
    }
    
    // Create a fresh canvas
    canvas = document.createElement('canvas');
    canvas.id = 'demand-forecast-chart';
    // Clear the container and append the new canvas
    chartContainer.innerHTML = '';
    chartContainer.appendChild(canvas);
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js is not loaded for forecast chart. Retrying...');
        setTimeout(() => renderForecastChartWithData(forecastData), 500);
        return;
    }
    
    // Extract data from forecast
    let labels = [];
    let historicalData = [];
    let forecastedData = [];
    
    // Check for different possible data formats from the LLM
    if (forecastData && forecastData.daily_forecast && Array.isArray(forecastData.daily_forecast)) {
        // If we have daily forecast data in the right format
        const data = forecastData.daily_forecast;
        
        data.forEach((point, index) => {
            labels.push(point.date || `Day ${index + 1}`);
            if (index < data.length / 2) {  // First half as historical data
                historicalData.push(point.quantity);
                forecastedData.push(null);
            } else {  // Second half as forecasted data
                historicalData.push(null);
                forecastedData.push(point.quantity);
            }
        });
    } else if (forecastData && forecastData.forecast_quantity) {
        // If we have a single forecast quantity from the LLM and explanation
        // Create a reasonable forecast visualization from this data
        const forecast_quantity = parseFloat(forecastData.forecast_quantity);
        const weeks = 8;  // Show 8 weeks
        
        // Create historical data with a pattern leading up to the forecast
        // Start with about 65% of the forecast value and show gradual growth
        const startValue = Math.round(forecast_quantity * 0.65);
        
        for (let i = 1; i <= weeks; i++) {
            labels.push(`Week ${i}`);
            
            if (i <= 5) {  // First 5 weeks as historical
                // Create a pattern with some variability
                let value;
                switch (i) {
                    case 1: value = startValue; break;
                    case 2: value = Math.round(startValue * 1.10); break;
                    case 3: value = Math.round(startValue * 1.20); break;
                    case 4: value = Math.round(startValue * 1.15); break;
                    case 5: value = Math.round(startValue * 1.25); break;
                }
                historicalData.push(value);
                forecastedData.push(null);
            } else {  // Last 3 weeks as forecast
                historicalData.push(null);
                
                if (i === 6) {
                    // Week 6 is where historical data ends and forecast begins
                    // Use the same value as week 5 for continuity
                    forecastedData.push(historicalData[4]);
                } else if (i === 7) {
                    forecastedData.push(Math.round(historicalData[4] * 1.1));
                } else if (i === 8) {
                    forecastedData.push(Math.round(historicalData[4] * 1.2));
                }
            }
        }
    } else if (forecastData && forecastData.data && Array.isArray(forecastData.data)) {
        // The original format expected by the function
        const data = forecastData.data;
        const historyCount = data.filter(d => d.is_historical).length;
        
        data.forEach((point, index) => {
            labels.push(point.date || `Day ${index + 1}`);
            
            if (point.is_historical) {
                historicalData.push(point.quantity);
                forecastedData.push(null);
            } else {
                historicalData.push(null);
                forecastedData.push(point.quantity);
            }
        });
    } else {
        // Fallback to sample data if API doesn't return expected format
        console.warn('Using fallback forecast data due to unexpected data format', forecastData);
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'];
        historicalData = [65, 72, 78, 75, 82, null, null, null];
        forecastedData = [null, null, null, null, 82, 85, 92, 98];
    }
    
    // Create the chart with a slight delay to ensure the DOM is updated
    setTimeout(() => {
        try {
            console.log("Creating new forecast chart");
            const ctx = canvas.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Historical Demand',
                            data: historicalData,
                            borderColor: 'rgba(63, 81, 181, 0.5)',
                            backgroundColor: 'rgba(63, 81, 181, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            pointRadius: 4,
                            pointBackgroundColor: 'rgba(63, 81, 181, 1)'
                        },
                        {
                            label: 'Forecasted Demand',
                            data: forecastedData,
                            borderColor: 'rgba(255, 64, 129, 0.8)',
                            backgroundColor: 'rgba(255, 64, 129, 0.1)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            tension: 0.3,
                            pointRadius: 4,
                            pointBackgroundColor: 'rgba(255, 64, 129, 1)'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: 'Units'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Time Period'
                            }
                        }
                    }
                }
            });
            
            // Ensure the chart container is visible
            chartContainer.style.display = 'block';
        } catch (error) {
            console.error("Error creating forecast chart:", error);
            chartContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Error creating chart: ${error.message}
                </div>
            `;
        }
    }, 50);
}

/**
 * Setup inventory status indicators
 */
function setupInventoryStatus() {
    const statusElements = document.querySelectorAll('[data-inventory-status]');
    
    statusElements.forEach(element => {
        const status = element.getAttribute('data-inventory-status');
        
        switch(status) {
            case 'critical':
                element.classList.add('bg-danger');
                break;
            case 'low':
                element.classList.add('bg-warning');
                break;
            case 'adequate':
                element.classList.add('bg-success');
                break;
            case 'overstock':
                element.classList.add('bg-info');
                break;
            default:
                element.classList.add('bg-secondary');
        }
    });
}

/**
 * Setup chart containers
 */
function setupChartContainers() {
    // Create forecast chart container if it doesn't exist
    let forecastChart = document.getElementById('forecast-chart');
    if (!forecastChart) {
        console.log('Creating forecast chart container during initial setup');
        const forecastTab = document.getElementById('forecast');
        if (forecastTab) {
            forecastChart = document.createElement('div');
            forecastChart.id = 'forecast-chart';
            forecastChart.className = 'chart-container mt-4';
            forecastChart.style.display = 'none';
            forecastChart.innerHTML = '<div class="text-center text-muted p-4">Enter Product ID and Store ID above to generate a forecast chart</div>';
            
            // Find where to insert the chart container
            const forecastResult = document.getElementById('forecastResult');
            if (forecastResult && forecastResult.parentNode) {
                forecastResult.parentNode.insertBefore(forecastChart, forecastResult.nextSibling);
            } else {
                // Fallback - append to the tab content
                forecastTab.appendChild(forecastChart);
            }
            
            console.log('Forecast chart container created');
        }
    } else {
        console.log('Forecast chart container already exists during setup');
    }
}

/**
 * Setup refresh buttons on dashboard
 */
function setupRefreshButtons() {
    // Top products refresh
    const loadTopProductsBtn = document.getElementById('loadTopProducts');
    if (loadTopProductsBtn) {
        loadTopProductsBtn.addEventListener('click', function() {
            const spinner = document.getElementById('topProductsSpinner');
            const container = document.getElementById('topProductsContainer');
            
            spinner.style.display = 'inline-block';
            
            // Load real data using API
            fetchAPI('/api/top-products', {
                queryParams: { limit: 10 }
            })
            .then(response => {
                if (response.status === 'success') {
                    const products = response.data;
                    
                    let html = `
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Product ID</th>
                                    <th>Store ID</th>
                                    <th>Total Sales</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    products.forEach(product => {
                        html += `
                            <tr>
                                <td>${product['Product ID']}</td>
                                <td>${product['Store ID']}</td>
                                <td><span class="badge bg-success">${product['total_sales']}</span></td>
                                <td>
                                    <div class="btn-group btn-group-sm" role="group">
                                        <button class="btn btn-sm btn-retailpulse-primary optimize-btn" 
                                            data-product="${product['Product ID']}" 
                                            data-store="${product['Store ID']}">
                                            <i class="bi bi-lightning-charge"></i> Optimize
                                        </button>
                                        <button class="btn btn-sm btn-retailpulse-primary forecast-btn" 
                                            data-product="${product['Product ID']}" 
                                            data-store="${product['Store ID']}">
                                            <i class="bi bi-graph-up"></i> Forecast
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    });
                    
                    html += `
                            </tbody>
                        </table>
                    `;
                    
                    container.innerHTML = html;
                    
                    // Setup action buttons
                    setupActionButtons();
                } else {
                    handleApiError(new Error(response.message || 'Failed to load top products'), 'topProductsContainer');
                }
            })
            .catch(error => {
                handleApiError(error, 'topProductsContainer');
            })
            .finally(() => {
                spinner.style.display = 'none';
            });
        });
    }
    
    // Critical inventory refresh
    const loadCriticalInventoryBtn = document.getElementById('loadCriticalInventory');
    if (loadCriticalInventoryBtn) {
        loadCriticalInventoryBtn.addEventListener('click', function() {
            const spinner = document.getElementById('criticalInventorySpinner');
            const container = document.getElementById('criticalInventoryContainer');
            
            spinner.style.display = 'inline-block';
            
            // Load real data using API
            fetchAPI('/api/critical-inventory', {
                queryParams: { limit: 10 }
            })
            .then(response => {
                if (response.status === 'success') {
                    const items = response.data;
                    
                    let html = `
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Product ID</th>
                                    <th>Store ID</th>
                                    <th>Current Stock</th>
                                    <th>Reorder Point</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    items.forEach(item => {
                        // Calculate stock status
                        const stockLevel = item['Stock Levels'];
                        const reorderPoint = item['Reorder Point'];
                        const stockDifference = reorderPoint - stockLevel;
                        
                        let statusClass = 'bg-success';
                        let statusText = 'Adequate';
                        
                        if (stockLevel <= 0) {
                            statusClass = 'bg-danger';
                            statusText = 'Out of Stock';
                        } else if (stockDifference > reorderPoint * 0.5) {
                            statusClass = 'bg-danger';
                            statusText = 'Critical';
                        } else if (stockDifference > 0) {
                            statusClass = 'bg-warning';
                            statusText = 'Low';
                        }
                        
                        html += `
                            <tr>
                                <td>${item['Product ID']}</td>
                                <td>${item['Store ID']}</td>
                                <td>${item['Stock Levels']}</td>
                                <td>${item['Reorder Point']}</td>
                                <td><span class="badge ${statusClass}">${statusText}</span></td>
                                <td>
                                    <button class="btn btn-sm btn-warning supply-chain-btn" 
                                        data-product="${item['Product ID']}" 
                                        data-store="${item['Store ID']}">
                                        <i class="bi bi-truck"></i> Order
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                    
                    html += `
                            </tbody>
                        </table>
                    `;
                    
                    container.innerHTML = html;
                    
                    // Setup action buttons
                    setupActionButtons();
                } else {
                    handleApiError(new Error(response.message || 'Failed to load critical inventory'), 'criticalInventoryContainer');
                }
            })
            .catch(error => {
                handleApiError(error, 'criticalInventoryContainer');
            })
            .finally(() => {
                spinner.style.display = 'none';
            });
        });
    }
}

/**
 * Setup action buttons for tables
 */
function setupActionButtons() {
    // Optimize buttons
    document.querySelectorAll('.optimize-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product');
            const storeId = this.getAttribute('data-store');
            
            // Navigate to optimize tab and fill in the form
            document.getElementById('optimize-tab').click();
            document.getElementById('productId').value = productId;
            document.getElementById('storeId').value = storeId;
        });
    });
    
    // Forecast buttons
    document.querySelectorAll('.forecast-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product');
            const storeId = this.getAttribute('data-store');
            
            // Navigate to forecast tab and fill in the form
            document.getElementById('forecast-tab').click();
            document.getElementById('forecastProductId').value = productId;
            document.getElementById('forecastStoreId').value = storeId;
        });
    });
    
    // Supply chain buttons
    document.querySelectorAll('.supply-chain-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product');
            const storeId = this.getAttribute('data-store');
            
            // Navigate to supply chain tab and fill in the form
            document.getElementById('supply-chain-tab').click();
            document.getElementById('supplyChainProductId').value = productId;
            document.getElementById('supplyChainStoreId').value = storeId;
        });
    });
} 