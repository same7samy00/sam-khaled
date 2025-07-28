// app.js - نسخة محسنة ومتكاملة

// الانتظار حتى يتم تحميل محتوى الصفحة بالكامل قبل تشغيل أي كود
document.addEventListener('DOMContentLoaded', () => {

    // ----------------------------------------------------------------------
    // 1. تهيئة Firebase
    // ----------------------------------------------------------------------
    const firebaseConfig = {
        apiKey: "AIzaSyAtePw7SP1R2POlPP9_Ot-YLNn0GQlebDg",
        authDomain: "pharmacy-6cc74.firebaseapp.com",
        projectId: "pharmacy-6cc74",
        storageBucket: "pharmacy-6cc74.firebasestorage.app",
        messagingSenderId: "1754889135",
        appId: "1:1754889135:web:f678d7b103b62dbde68d5a",
        measurementId: "G-N937J7C5KC"
    };

    // تهيئة Firebase والوصول للخدمات
    const app = firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const analytics = firebase.analytics();

    // ----------------------------------------------------------------------
    // 2. دوال المساعدة العامة (Utils)
    // ----------------------------------------------------------------------
    const showMessage = (elementId, message, isError = true) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            element.className = isError ? 'error-message' : 'success-message';
            setTimeout(() => {
                element.style.display = 'none';
                element.textContent = '';
            }, 5000);
        }
    };

    const redirectTo = (page) => {
        window.location.href = page;
    };

    const formatArabicDate = (date) => {
        if (!date) return 'غير متوفر';
        // التأكد من أن المدخل هو كائن Date
        if (!(date instanceof Date)) {
            // محاولة تحويله إذا كان timestamp من Firestore
            if (date && typeof date.toDate === 'function') {
                date = date.toDate();
            } else {
                return 'تاريخ غير صالح';
            }
        }
        return new Intl.DateTimeFormat('ar-EG', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
    };
    
    const getTodayDateFormatted = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };


    // ----------------------------------------------------------------------
    // 3. منطق الماسح الضوئي العام (Global Scanner)
    // ----------------------------------------------------------------------
    const globalScannerModal = document.getElementById('globalScannerModal');
    if (globalScannerModal) {
        const globalQrVideo = document.getElementById('global-qr-video');
        const globalScanResult = document.getElementById('global-scan-result');
        const globalStartScannerBtn = document.getElementById('globalStartScannerBtn');
        const globalStopScannerBtn = document.getElementById('globalStopScannerBtn');
        const globalManualBarcodeInput = document.getElementById('globalManualBarcodeInput');
        const globalProcessManualBarcodeBtn = document.getElementById('globalProcessManualBarcodeBtn');
        const globalScannerCloseBtn = globalScannerModal.querySelector('.close-button');

        let globalQrScanner = null;
        let targetInputForBarcode = null;

        const openGlobalScanner = (targetInputId) => {
            targetInputForBarcode = document.getElementById(targetInputId);
            globalScanResult.textContent = 'انقر على "ابدأ المسح" لتفعيل الكاميرا.';
            globalManualBarcodeInput.value = '';
            globalScannerModal.style.display = 'flex';
            globalStartScannerBtn.style.display = 'inline-flex';
            globalStopScannerBtn.style.display = 'none';
        };

        const closeGlobalScanner = () => {
            if (globalQrScanner) {
                globalQrScanner.stop();
                globalQrScanner.destroy();
                globalQrScanner = null;
            }
            globalScannerModal.style.display = 'none';
        };

        globalStartScannerBtn.addEventListener('click', async () => {
            globalStartScannerBtn.style.display = 'none';
            globalScanResult.textContent = 'جاري تفعيل الكاميرا...';

            try {
                // التأكد من عدم وجود ماسح قديم
                if (globalQrScanner) {
                    globalQrScanner.destroy();
                    globalQrScanner = null;
                }

                globalQrScanner = new QrScanner(
                    globalQrVideo,
                    result => {
                        const barcode = result.data;
                        globalScanResult.textContent = `تم المسح: ${barcode}`;
                        if (targetInputForBarcode) {
                            targetInputForBarcode.value = barcode;
                            // تفعيل حدث input للبحث الفوري
                            targetInputForBarcode.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                        setTimeout(closeGlobalScanner, 500); // إغلاق بعد نصف ثانية
                    }, {
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                    }
                );
                
                await globalQrScanner.start();
                globalStopScannerBtn.style.display = 'inline-flex';
                globalScanResult.textContent = 'الكاميرا جاهزة، وجهها نحو الباركود.';

            } catch (error) {
                console.error("خطأ في تشغيل الماسح الضوئي:", error);
                globalScanResult.textContent = 'فشل تشغيل الكاميرا. تأكد من منح الأذونات.';
                globalStartScannerBtn.style.display = 'inline-flex';
            }
        });

        globalStopScannerBtn.addEventListener('click', closeGlobalScanner);
        globalScannerCloseBtn.addEventListener('click', closeGlobalScanner);
        
        globalProcessManualBarcodeBtn.addEventListener('click', () => {
             const barcode = globalManualBarcodeInput.value.trim();
             if(barcode && targetInputForBarcode){
                targetInputForBarcode.value = barcode;
                targetInputForBarcode.dispatchEvent(new Event('input', { bubbles: true }));
                closeGlobalScanner();
             }
        });
        
        // ربط جميع أزرار فتح الماسح بالدالة
        document.querySelectorAll('.open-scanner-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetInputId = e.currentTarget.dataset.targetInput;
                openGlobalScanner(targetInputId);
            });
        });

        window.addEventListener('click', (event) => {
            if (event.target === globalScannerModal) {
                closeGlobalScanner();
            }
        });
    }

    // ----------------------------------------------------------------------
    // 4. منطق المصادقة وتسجيل الخروج (Authentication)
    // ----------------------------------------------------------------------
    const currentPageFileName = window.location.pathname.split('/').pop() || 'index.html';

    // حماية الصفحات
    auth.onAuthStateChanged(user => {
        const isAuthPage = currentPageFileName === 'login.html';
        if (user) {
            // المستخدم مسجل دخوله
            if (isAuthPage) {
                redirectTo('index.html');
            }
            // تحديث اسم المستخدم في الواجهة
            document.querySelectorAll('.user-info span').forEach(el => {
                 el.textContent = `مرحباً، ${user.email.split('@')[0]}!`;
            });
        } else {
            // المستخدم غير مسجل دخوله
            if (!isAuthPage) {
                redirectTo('login.html');
            }
        }
    });

    // منطق صفحة تسجيل الدخول
    if (currentPageFileName === 'login.html') {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = loginForm['username'].value;
                const password = loginForm['password'].value;
                try {
                    await auth.signInWithEmailAndPassword(email, password);
                    // onAuthStateChanged سيتولى إعادة التوجيه
                } catch (error) {
                    console.error("Login Error:", error);
                    showMessage('loginMessage', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
                }
            });
        }
    }
    
    // منطق تسجيل الخروج
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await auth.signOut();
                // onAuthStateChanged سيتولى إعادة التوجيه
            } catch (error) {
                console.error("Logout Error:", error);
                alert('حدث خطأ أثناء تسجيل الخروج.');
            }
        });
    }


    // ----------------------------------------------------------------------
    // 5. منطق إدارة المنتجات (Inventory Management)
    // ----------------------------------------------------------------------
    if (currentPageFileName === 'inventory.html') {
        const productModal = document.getElementById('productModal');
        const addProductBtn = document.getElementById('addProductBtn');
        const productForm = document.getElementById('productForm');
        const productTableBody = document.getElementById('productTableBody');
        const productSearchInput = document.getElementById('productSearch');
        const filterBySelect = document.getElementById('filterBy');
        let editProductId = null;

        const openProductModal = () => {
            productForm.reset();
            editProductId = null;
            document.getElementById('modalTitle').textContent = 'إضافة منتج جديد';
            productModal.style.display = 'flex';
        };

        const closeProductModal = () => productModal.style.display = 'none';

        addProductBtn.addEventListener('click', openProductModal);
        productModal.querySelector('.close-button').addEventListener('click', closeProductModal);

        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const productData = {
                name: productForm['productName'].value.trim(),
                price: parseFloat(productForm['productPrice'].value),
                unit: productForm['productUnit'].value,
                quantity: parseInt(productForm['productQuantity'].value),
                supplier: productForm['productSupplier'].value.trim() || 'غير محدد',
                barcode: productForm['productBarcode'].value.trim() || null,
                productionDate: productForm['productionDate'].value || null,
                expiryDate: productForm['expiryDate'].value || null,
                name_lowercase: productForm['productName'].value.trim().toLowerCase() // للحصول على بحث غير حساس لحالة الأحرف
            };

            try {
                if (editProductId) {
                    await db.collection('products').doc(editProductId).update(productData);
                    alert('تم تعديل المنتج بنجاح.');
                } else {
                    await db.collection('products').add(productData);
                    alert('تم إضافة المنتج بنجاح.');
                }
                closeProductModal();
            } catch (error) {
                console.error("Error saving product:", error);
                alert('فشل حفظ المنتج.');
            }
        });
        
        const renderProducts = (docs) => {
            productTableBody.innerHTML = '';
            if (docs.length === 0) {
                productTableBody.innerHTML = '<tr><td colspan="9" class="no-data-row">لا توجد منتجات تطابق البحث.</td></tr>';
                return;
            }
            docs.forEach(doc => {
                const product = doc.data();
                const row = productTableBody.insertRow();
                row.dataset.id = doc.id;
                row.innerHTML = `
                    <td>${product.barcode || 'N/A'}</td>
                    <td>${product.name}</td>
                    <td>${product.price.toFixed(2)}</td>
                    <td>${product.unit}</td>
                    <td>${product.quantity}</td>
                    <td>${product.supplier}</td>
                    <td>${product.productionDate || 'N/A'}</td>
                    <td>${product.expiryDate || 'N/A'}</td>
                    <td class="actions-cell">
                        <button class="btn btn-primary btn-icon edit-btn"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-icon delete-btn"><i class="fas fa-trash"></i></button>
                    </td>
                `;
            });
        };
        
        db.collection('products').orderBy('name').onSnapshot(snapshot => {
             renderProducts(snapshot.docs);
        }, err => console.error(err));
        
        productTableBody.addEventListener('click', async (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            const row = target.closest('tr');
            const docId = row.dataset.id;
            
            if (target.classList.contains('edit-btn')) {
                const doc = await db.collection('products').doc(docId).get();
                if (doc.exists) {
                    const data = doc.data();
                    editProductId = docId;
                    productForm['productName'].value = data.name;
                    productForm['productPrice'].value = data.price;
                    productForm['productUnit'].value = data.unit;
                    productForm['productQuantity'].value = data.quantity;
                    productForm['productSupplier'].value = data.supplier;
                    productForm['productBarcode'].value = data.barcode;
                    productForm['productionDate'].value = data.productionDate;
                    productForm['expiryDate'].value = data.expiryDate;
                    document.getElementById('modalTitle').textContent = 'تعديل المنتج';
                    productModal.style.display = 'flex';
                }
            } else if (target.classList.contains('delete-btn')) {
                if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
                    await db.collection('products').doc(docId).delete();
                    alert('تم حذف المنتج.');
                }
            }
        });
    }
    

    // ----------------------------------------------------------------------
    // 6. منطق نقطة البيع (POS)
    // ----------------------------------------------------------------------
    if (currentPageFileName === 'pos.html') {
        const posProductSearchInput = document.getElementById('posProductSearch');
        const posSearchResultsDiv = document.getElementById('posSearchResults');
        const invoiceItemsBody = document.getElementById('invoiceItemsBody');
        const subTotalSpan = document.getElementById('subTotal');
        const grandTotalSpan = document.getElementById('grandTotal');
        const discountInput = document.getElementById('discount');
        const taxInput = document.getElementById('tax');
        const completeSaleBtn = document.getElementById('completeSaleBtn');

        let invoiceItems = [];
        let searchTimeout;

        const renderInvoice = () => {
            invoiceItemsBody.innerHTML = '';
            if (invoiceItems.length === 0) {
                 invoiceItemsBody.innerHTML = '<tr><td colspan="6" class="no-data-row">لم يتم إضافة أي منتجات بعد.</td></tr>';
            } else {
                 invoiceItems.forEach((item, index) => {
                    const row = invoiceItemsBody.insertRow();
                    row.innerHTML = `
                        <td>${item.name}</td>
                        <td>${item.unit}</td>
                        <td><input type="number" class="invoice-item-qty" value="${item.quantity}" min="1" data-index="${index}"></td>
                        <td>${item.price.toFixed(2)}</td>
                        <td>${(item.price * item.quantity).toFixed(2)}</td>
                        <td><button class="btn btn-danger btn-sm remove-item-btn" data-index="${index}"><i class="fas fa-trash"></i></button></td>
                    `;
                });
            }
            calculateTotals();
        };
        
        const calculateTotals = () => {
             let subTotal = invoiceItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
             let discountValue = parseFloat(discountInput.value) || 0;
             let taxPercent = parseFloat(taxInput.value) || 0;
             
             let totalAfterDiscount = subTotal - discountValue;
             let taxAmount = totalAfterDiscount * (taxPercent / 100);
             let grandTotal = totalAfterDiscount + taxAmount;
             
             subTotalSpan.textContent = subTotal.toFixed(2);
             grandTotalSpan.textContent = grandTotal.toFixed(2);
        };
        
        invoiceItemsBody.addEventListener('change', (e) => {
             if(e.target.classList.contains('invoice-item-qty')){
                const index = e.target.dataset.index;
                const newQty = parseInt(e.target.value);
                if (newQty > 0) {
                    invoiceItems[index].quantity = newQty;
                    renderInvoice();
                }
             }
        });
        
        invoiceItemsBody.addEventListener('click', (e) => {
             if(e.target.closest('.remove-item-btn')){
                const index = e.target.closest('.remove-item-btn').dataset.index;
                invoiceItems.splice(index, 1);
                renderInvoice();
             }
        });
        
        [discountInput, taxInput].forEach(input => input.addEventListener('input', calculateTotals));

        posSearchResultsDiv.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart-btn')) {
                const button = e.target.closest('.add-to-cart-btn');
                const product = {
                    id: button.dataset.productId,
                    name: button.dataset.productName,
                    price: parseFloat(button.dataset.productPrice),
                    unit: button.dataset.productUnit,
                    quantity: 1
                };

                const existingItem = invoiceItems.find(item => item.id === product.id);
                if (existingItem) {
                    existingItem.quantity++;
                } else {
                    invoiceItems.push(product);
                }
                renderInvoice();
            }
        });

        posProductSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const searchTerm = posProductSearchInput.value.trim().toLowerCase();
            if (searchTerm.length < 2) {
                posSearchResultsDiv.innerHTML = '<p class="no-data-row">أدخل حرفين على الأقل للبحث.</p>';
                return;
            }
            searchTimeout = setTimeout(async () => {
                posSearchResultsDiv.innerHTML = '<p class="no-data-row">جاري البحث...</p>';
                try {
                    // ملاحظة: البحث الفعال يتطلب فهرسة في Firestore
                    const snapshot = await db.collection('products')
                                            .where('name_lowercase', '>=', searchTerm)
                                            .where('name_lowercase', '<=', searchTerm + '\uf8ff')
                                            .limit(10)
                                            .get();
                    
                    posSearchResultsDiv.innerHTML = '';
                    if (snapshot.empty) {
                        posSearchResultsDiv.innerHTML = '<p class="no-data-row">لا توجد منتجات مطابقة.</p>';
                    } else {
                        snapshot.forEach(doc => {
                            const product = doc.data();
                            posSearchResultsDiv.innerHTML += `
                                <div class="product-item-result">
                                    <span>${product.name} - ${product.price.toFixed(2)} جنيه</span>
                                    <button class="btn btn-primary btn-sm add-to-cart-btn"
                                            data-product-id="${doc.id}"
                                            data-product-name="${product.name}"
                                            data-product-price="${product.price}"
                                            data-product-unit="${product.unit}">
                                        <i class="fas fa-cart-plus"></i> إضافة
                                    </button>
                                </div>
                            `;
                        });
                    }
                } catch (error) {
                    console.error("POS search error:", error);
                    posSearchResultsDiv.innerHTML = '<p class="no-data-row" style="color:var(--error-color);">خطأ في البحث.</p>';
                }
            }, 300);
        });
        
        completeSaleBtn.addEventListener('click', async () => {
             if (invoiceItems.length === 0) {
                alert('الفاتورة فارغة!');
                return;
             }

             const grandTotal = parseFloat(grandTotalSpan.textContent);
             const invoiceData = {
                 timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                 items: invoiceItems,
                 subTotal: parseFloat(subTotalSpan.textContent),
                 discount: parseFloat(discountInput.value) || 0,
                 tax: parseFloat(taxInput.value) || 0,
                 grandTotal: grandTotal,
                 paymentType: document.getElementById('paymentType').value
             };
             
             const batch = db.batch(); // استخدام batch لضمان تنفيذ كل العمليات معًا
             
             try {
                // 1. إضافة الفاتورة للمبيعات
                const saleRef = db.collection('sales').doc();
                batch.set(saleRef, invoiceData);
                
                // 2. تحديث كميات المنتجات
                invoiceItems.forEach(item => {
                    const productRef = db.collection('products').doc(item.id);
                    batch.update(productRef, {
                        quantity: firebase.firestore.FieldValue.increment(-item.quantity)
                    });
                });
                
                await batch.commit();
                alert('تمت عملية البيع بنجاح!');
                // إعادة تعيين الواجهة
                invoiceItems = [];
                renderInvoice();
                posProductSearchInput.value = '';
                posSearchResultsDiv.innerHTML = '<p class="no-data-row">ابحث عن منتج لإضافته للفاتورة.</p>';
                discountInput.value = '0';
                taxInput.value = '0';
             } catch(error) {
                console.error("Error completing sale:", error);
                alert('فشل إتمام البيع. قد تكون الكمية غير كافية لأحد المنتجات.');
             }
        });
        
        renderInvoice();
    }


    // ----------------------------------------------------------------------
    // 7. منطق لوحة التحكم (Dashboard)
    // ----------------------------------------------------------------------
    if (currentPageFileName === 'index.html') {
        const todaySalesEl = document.getElementById('todaySales');
        const todayInvoicesEl = document.getElementById('todayInvoices');
        const lowStockCountEl = document.getElementById('lowStockCount');
        const expiringCountEl = document.getElementById('expiringCount');

        // منتجات منخفضة المخزون
        db.collection('products').where('quantity', '<=', 10).onSnapshot(snap => {
            lowStockCountEl.textContent = snap.size;
        });

        // مبيعات اليوم
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        db.collection('sales').where('timestamp', '>=', startOfDay).onSnapshot(snap => {
            let totalSales = 0;
            snap.forEach(doc => {
                totalSales += doc.data().grandTotal;
            });
            todaySalesEl.textContent = `${totalSales.toFixed(2)} جنيه`;
            todayInvoicesEl.textContent = snap.size;
        });
        
        // منتجات قرب انتهاء الصلاحية (مثال: خلال 90 يوم)
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
        const ninetyDaysFromNowStr = ninetyDaysFromNow.toISOString().split('T')[0];
        
        db.collection('products').where('expiryDate', '!=', null).where('expiryDate', '<=', ninetyDaysFromNowStr).get().then(snap => {
            expiringCountEl.textContent = snap.size;
        });

        // مخطط وهمي للمبيعات (يمكن تطويره لاحقًا ليعكس البيانات الحقيقية)
        const salesChartCanvas = document.getElementById('salesChart');
        if (salesChartCanvas) {
            new Chart(salesChartCanvas, {
                type: 'line',
                data: {
                    labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
                    datasets: [{
                        label: 'إجمالي المبيعات',
                        data: [120, 190, 300, 500, 230, 170, 350],
                        backgroundColor: 'rgba(52, 152, 219, 0.2)',
                        borderColor: 'var(--primary-color)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                }
            });
        }
    }
    
    // ----------------------------------------------------------------------
    // 8. منطق إدارة العملاء (Customers)
    // ----------------------------------------------------------------------
     if (currentPageFileName === 'customers.html') {
        const customerModal = document.getElementById('customerModal');
        const addCustomerBtn = document.getElementById('addCustomerBtn');
        const customerForm = document.getElementById('customerForm');
        const customerTableBody = document.getElementById('customerTableBody');
        let editingCustomerId = null;

        const openCustomerModal = () => {
            customerForm.reset();
            editingCustomerId = null;
            document.getElementById('customerModalTitle').textContent = 'إضافة عميل جديد';
            customerModal.style.display = 'flex';
        };

        const closeCustomerModal = () => customerModal.style.display = 'none';

        addCustomerBtn.addEventListener('click', openCustomerModal);
        customerModal.querySelector('.close-button').addEventListener('click', closeCustomerModal);

        customerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const customerData = {
                name: customerForm['customerName'].value.trim(),
                phone: customerForm['customerPhone'].value.trim() || null,
                address: customerForm['customerAddress'].value.trim() || null,
                notes: customerForm['customerNotes'].value.trim() || null,
            };

            try {
                if (editingCustomerId) {
                    await db.collection('customers').doc(editingCustomerId).update(customerData);
                    alert('تم تعديل العميل بنجاح.');
                } else {
                    await db.collection('customers').add({...customerData, currentDebt: 0, createdAt: firebase.firestore.FieldValue.serverTimestamp()});
                    alert('تم إضافة العميل بنجاح.');
                }
                closeCustomerModal();
            } catch (error) {
                console.error("Error saving customer:", error);
                alert('فشل حفظ العميل.');
            }
        });
        
        db.collection('customers').orderBy('name').onSnapshot(snapshot => {
             customerTableBody.innerHTML = '';
             if (snapshot.empty) {
                customerTableBody.innerHTML = '<tr><td colspan="7" class="no-data-row">لا يوجد عملاء.</td></tr>';
                return;
             }
             snapshot.forEach(doc => {
                 const customer = doc.data();
                 const row = customerTableBody.insertRow();
                 row.dataset.id = doc.id;
                 row.innerHTML = `
                    <td>${customer.name}</td>
                    <td>${customer.phone || 'N/A'}</td>
                    <td>${customer.address || 'N/A'}</td>
                    <td>${(customer.currentDebt || 0).toFixed(2)}</td>
                    <td>${customer.invoiceCount || 0}</td>
                    <td>${customer.lastTransaction ? formatArabicDate(customer.lastTransaction) : 'N/A'}</td>
                    <td class="actions-cell">
                        <button class="btn btn-primary btn-icon edit-customer-btn"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-icon delete-customer-btn"><i class="fas fa-trash"></i></button>
                    </td>
                 `;
             });
        }, err => console.error(err));
        
        customerTableBody.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if(!button) return;
            
            const docId = button.closest('tr').dataset.id;
            
            if(button.classList.contains('edit-customer-btn')){
                const doc = await db.collection('customers').doc(docId).get();
                if(doc.exists){
                    const data = doc.data();
                    editingCustomerId = docId;
                    customerForm['customerName'].value = data.name;
                    customerForm['customerPhone'].value = data.phone;
                    customerForm['customerAddress'].value = data.address;
                    customerForm['customerNotes'].value = data.notes;
                    document.getElementById('customerModalTitle').textContent = 'تعديل بيانات العميل';
                    customerModal.style.display = 'flex';
                }
            } else if (button.classList.contains('delete-customer-btn')){
                if (confirm('هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.')) {
                    await db.collection('customers').doc(docId).delete();
                    alert('تم حذف العميل.');
                }
            }
        });
     }

});
