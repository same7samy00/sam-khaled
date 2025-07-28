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
        if (!(date instanceof Date)) {
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
            globalScanResult.textContent = 'جاري تفعيل الكاميرا...';
            try {
                if (globalQrScanner) {
                    globalQrScanner.destroy();
                    globalQrScanner = null;
                }
                globalQrScanner = new QrScanner(
                    globalQrVideo,
                    result => {
                        const barcode = result.data;
                        if (targetInputForBarcode) {
                            targetInputForBarcode.value = barcode;
                            targetInputForBarcode.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                        setTimeout(closeGlobalScanner, 500);
                    }, { highlightScanRegion: true, highlightCodeOutline: true }
                );
                await globalQrScanner.start();
                globalScanResult.textContent = 'الكاميرا جاهزة، وجهها نحو الباركود.';
            } catch (error) {
                console.error("خطأ في تشغيل الماسح الضوئي:", error);
                globalScanResult.textContent = 'فشل تشغيل الكاميرا. تأكد من منح الأذونات.';
            }
        });

        globalStopScannerBtn.addEventListener('click', closeGlobalScanner);
        globalScannerCloseBtn.addEventListener('click', closeGlobalScanner);
        
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
    const currentPageFileName = window.location.pathname.split('/').pop() || 'login.html';

    auth.onAuthStateChanged(user => {
        const isAuthPage = currentPageFileName === 'login.html';
        if (user) {
            if (isAuthPage) {
                redirectTo('index.html');
            }
            document.querySelectorAll('.user-info span').forEach(el => {
                 el.textContent = `مرحباً، ${user.email.split('@')[0]}!`;
            });
        } else {
            if (!isAuthPage) {
                redirectTo('login.html');
            }
        }
    });

    if (currentPageFileName === 'login.html') {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = loginForm['username'].value;
                const password = loginForm['password'].value;
                try {
                    await auth.signInWithEmailAndPassword(email, password);
                } catch (error) {
                    showMessage('loginMessage', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
                }
            });
        }
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await auth.signOut();
            } catch (error) {
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
                name_lowercase: productForm['productName'].value.trim().toLowerCase()
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
                alert('فشل حفظ المنتج.');
            }
        });
        
        db.collection('products').orderBy('name').onSnapshot(snapshot => {
             productTableBody.innerHTML = '';
             if (snapshot.empty) {
                productTableBody.innerHTML = '<tr><td colspan="9" class="no-data-row">لا توجد منتجات.</td></tr>';
                return;
             }
             snapshot.forEach(doc => {
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
        }, err => console.error(err));
        
        productTableBody.addEventListener('click', async (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            const docId = target.closest('tr').dataset.id;
            
            if (target.classList.contains('edit-btn')) {
                const doc = await db.collection('products').doc(docId).get();
                if (doc.exists) {
                    const data = doc.data();
                    editProductId = docId;
                    for (const key in data) {
                        if (productForm[key]) {
                            productForm[key].value = data[key];
                        }
                    }
                    document.getElementById('modalTitle').textContent = 'تعديل المنتج';
                    productModal.style.display = 'flex';
                }
            } else if (target.classList.contains('delete-btn')) {
                if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
                    await db.collection('products').doc(docId).delete();
                }
            }
        });
    }
});
