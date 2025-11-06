"use strict";

const StoneSoftGateway = (() => {
    const cache = {
        products: null,
        loading: null
    };

    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    };

    const jsonpRequest = (url, params) => {
        return new Promise((resolve, reject) => {
            const callbackName = `jsonp_callback_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
            const script = document.createElement('script');
            const timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('Request timeout'));
            }, 10000);

            const queryString = Object.keys(params)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join('&');

            window[callbackName] = (data) => {
                cleanup();
                resolve(data);
            };

            const cleanup = () => {
                clearTimeout(timeoutId);
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                delete window[callbackName];
            };

            script.onerror = () => {
                cleanup();
                reject(new Error('Script loading failed'));
            };

            script.src = `${url}?${queryString}&callback=${callbackName}`;
            document.head.appendChild(script);
        });
    };

    const toggleLoading = (show) => {
        if (!cache.loading) {
            cache.loading = document.querySelector('.loading');
        }
        if (cache.loading) {
            cache.loading.style.display = show ? 'block' : 'none';
        }
    };

    const processApi = async (accountId, productId) => {
        try {
            toggleLoading(true);

            const response = await jsonpRequest('https://www.sexyko.com/order_notify/pay', {
                account_id: accountId,
                productid: productId
            });

            if (response.success && response.data?.paymentUrl) {
                window.location.href = response.data.paymentUrl;
            } else {
                throw new Error('Invalid response');
            }
        } catch (error) {
            console.error('Payment error:', error);
            toggleLoading(false);
            alert('Bir hata oluştu.');
        }
    };

    const handleEvents = () => {
        if (!cache.products) {
            cache.products = document.querySelector('.products');
        }

        if (cache.products._clickHandler) {
            cache.products.removeEventListener('click', cache.products._clickHandler);
        }

        const clickHandler = (e) => {
            const buyButton = e.target.closest('[data-action="buy"]');
            if (buyButton) {
                e.preventDefault();
                const productId = buyButton.dataset.productId;
                if (productId && window.data?.account_id) {
                    processApi(window.data.account_id, productId);
                }
            }
        };

        cache.products._clickHandler = clickHandler;
        cache.products.addEventListener('click', clickHandler);
    };

    const generateProductHTML = (product) => {
        return `<div class="product-item">
                    <div class="pimg-base">
                        <div class="product-image" style="background-image: url('${escapeHtml(product.ProductImage)}');"></div>
                    </div>
                    <div class="product-detail">
                        <div class="product-name d-block">${escapeHtml(product.ProductName)}</div>
                        <button type="button" role="button" data-action="buy" class="button" data-product-id="${escapeHtml(product.ProductID)}">
                            <span>Satın Al &gt; ${escapeHtml(product.Cost)} TL</span>
                        </button>
                    </div>
                </div>`;
    };

    const escapeHtml = (str) => {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    };

    const initPage = () => {
        if (!window.data?.items) {
            console.error('Product data not found');
            return;
        }

        if (!cache.products) {
            cache.products = document.querySelector('.products');
        }

        if (!cache.products) {
            console.error('.products element not found');
            return;
        }

        const fragment = document.createDocumentFragment();
        const tempDiv = document.createElement('div');

        const html = window.data.items
            .map(product => generateProductHTML(product))
            .join('');

        tempDiv.innerHTML = html;

        while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
        }

        cache.products.innerHTML = '';
        cache.products.appendChild(fragment);

        handleEvents();
    };

    return {
        init: async () => {
            try {
                await loadScript('data.js');

                if (!window.data) {
                    throw new Error('Data file loaded but data object not found');
                }

                initPage();
            } catch (error) {
                console.error('Initialization error:', error);
                alert('Veri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
            }
        }
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        StoneSoftGateway.init();
    });
} else {
    StoneSoftGateway.init();
}
