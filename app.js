// app.js

// ----------------------------------------------------------------------
// 1. تهيئة Firebase - **تم تصحيح طريقة الاستيراد النهائية**
// ----------------------------------------------------------------------
// عند استخدام Firebase SDK v9+ في متصفح عادي (بدون bundler مثل Webpack/Rollup)،
// يجب تحميل ملفات الـ SDK الأساسية في HTML كـ "نصوص برمجية عادية"
// ثم الوصول إلى الخدمات عبر الكائنات العامة التي يقوم Firebase بتعريفها.
// هذا يحل مشكلة "Uncaught SyntaxError: Unexpected token 'export'".

// لا يوجد أي `import` هنا لـ Firebase أو QrScanner.
// يتم الوصول إليها عبر الكائنات العامة `firebase` و `QrScanner`.

// بيانات تهيئة مشروع Firebase الخاص بك (التي قدمتها)
const firebaseConfig = {
    apiKey: "AIzaSyAtePw7SP1R2POlPP9_Ot-YLNn0GQlebDg", // <--- استبدل هذا
    authDomain: "pharmacy-6cc74.firebaseapp.com", // <--- استبدل هذا
    projectId: "pharmacy-6cc74", // <--- استبدل هذا
    storageBucket: "pharmacy-6cc74.firebasestorage.app", // <--- استبدل هذا
    messagingSenderId: "1754889135", // <--- استبدل هذا
    appId: "1:1754889135:web:f678d7b103b62dbde68d5a", // <--- استبدل هذا
    measurementId: "G-N937J7C5KC" // <--- استبدل هذا
};

// تهيئة Firebase والحصول على الخدمات من الكائن العام 'firebase'
// يجب أن يكون 'firebase' متاحًا عالميًا بعد تحميل السكربتات في HTML.
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); // الوصول إلى المصادقة
const db = firebase.firestore(); // الوصول إلى Firestore
const analytics = firebase.analytics(); // الوصول إلى التحليلات

// ----------------------------------------------------------------------
// 2. دوال المساعدة العامة (Utils Functions)
// ----------------------------------------------------------------------

function showMessage(elementId, message, isError = true) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.color = isError ? 'var(--error-color)' : 'var(--success-color)';
        setTimeout(() => {
            element.textContent = '';
        }, 5000);
    }
}

function redirectTo(page) {
    window.location.href = page;
}

function formatArabicDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Error formatting date:", e);
        return dateString;
    }
}

function getTodayDateFormatted() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ----------------------------------------------------------------------
// 3. منطق الماسح الضوئي العام (Global Barcode Scanner Logic) - تم تحسينه
// ----------------------------------------------------------------------

const globalScannerModal = document.getElementById('globalScannerModal');
const globalQrVideo = document.getElementById('global-qr-video');
const globalScanResult = document.getElementById('global-scan-result');
const globalStartScannerBtn = document.getElementById('globalStartScannerBtn');
const globalStopScannerBtn = document.getElementById('globalStopScannerBtn');
const globalManualBarcodeInput = document.getElementById('globalManualBarcodeInput');
const globalProcessManualBarcodeBtn = document.getElementById('globalProcessManualBarcodeBtn');
const globalScannerCloseBtn = globalScannerModal ? globalScannerModal.querySelector('.close-button') : null;

let globalQrScanner = null;
let targetInputForBarcode = null; // لتحديد حقل الإدخال الذي يجب وضع الباركود فيه

// دالة لفتح الماسح الضوئي العام
function openGlobalScanner(targetInputId = null) {
    globalScannerModal.style.display = 'flex'; // إظهار المودال
    targetInputForBarcode = targetInputId; // حفظ ID الحقل المستهدف

    globalScanResult.textContent = 'يرجى النقر على "ابدأ المسح"';
    globalManualBarcodeInput.value = ''; // مسح الحقل اليدوي

    if (globalQrScanner) {
        globalQrScanner.stop(); // التأكد من إيقافه قبل البدء
        globalQrScanner.destroy(); // تدمير الماسح السابق لتجنب مشاكل الكاميرا
        globalQrScanner = null; // إعادة تعيينه لإنشاء جديد
    }

    globalStartScannerBtn.style.display = 'inline-block';
    globalStopScannerBtn.style.display = 'none';
}

// دالة لإغلاق الماسح الضوئي العام
function closeGlobalScanner() {
    globalScannerModal.style.display = 'none'; // إخفاء المودال
    if (globalQrScanner) {
        globalQrScanner.stop();
        globalQrScanner.destroy(); // تحرير موارد الكاميرا
        globalQrScanner = null;
    }
    targetInputForBarcode = null; // مسح الحقل المستهدف
    globalScanResult.textContent = ''; // مسح نتيجة المسح
}

// تهيئة الماسح الضوئي عند بدء التشغيل
if (globalScannerModal) {
    // مستمع لزر الإغلاق في المودال العام
    if (globalScannerCloseBtn) {
        globalScannerCloseBtn.addEventListener('click', closeGlobalScanner);
    }

    // إغلاق المودال عند النقر خارج المحتوى
    window.addEventListener('click', (event) => {
        if (event.target === globalScannerModal) {
            closeGlobalScanner();
        }
    });

    // بدء الماسح الضوئي
    if (globalStartScannerBtn) {
        globalStartScannerBtn.addEventListener('click', async () => {
            if (!globalQrVideo) {
                globalScanResult.textContent = 'خطأ: عنصر الفيديو غير موجود.';
                console.error('Video element #global-qr-video not found.');
                return;
            }
            if (globalQrScanner) { // إذا كان موجوداً بالفعل، أعد تشغيله
                try {
                    await globalQrScanner.start();
                    globalStartScannerBtn.style.display = 'none';
                    globalStopScannerBtn.style.display = 'inline-block';
                    globalScanResult.textContent = 'الماسح جاهز... يرجى توجيه الكاميرا إلى الباركود.';
                } catch (error) {
                    console.error("خطأ في بدء الماسح العام (موجود):", error);
                    globalScanResult.textContent = 'لا يمكن بدء الماسح: ' + (error.message || error);
                }
                return;
            }

            // إنشاء ماسح جديد
            try {
                // QrScanner يجب أن تكون متاحة عالمياً هنا لأنها تحملت كسكربت عادي في HTML
                globalQrScanner = new QrScanner(
                    globalQrVideo,
                    result => {
                        const barcode = result.data;
                        globalScanResult.textContent = `تم مسح: ${barcode}`;
                        console.log('Scanned barcode:', barcode);
                        if (targetInputForBarcode) {
                            const inputElement = document.getElementById(targetInputForBarcode);
                            if (inputElement) {
                                inputElement.value = barcode;
                                // إذا كان الحقل هو حقل بحث، قم بتشغيل حدث 'input'
                                if (inputElement.id === 'productSearch' || inputElement.id === 'posProductSearch') {
                                    inputElement.dispatchEvent(new Event('input'));
                                }
                            }
                        }
                        closeGlobalScanner(); // إغلاق الماسح بعد المسح الناجح
                    },
                    {
                        onDecodeError: error => {
                            // console.warn(error); // يمكن أن يكون مزعجاً إذا كانت الأخطاء كثيرة
                        },
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                        // preferredCamera: 'environment' // قد يساعد في اختيار الكاميرا الخلفية على الجوال
                    }
                );
                await globalQrScanner.start();
                globalStartScannerBtn.style.display = 'none';
                globalStopScannerBtn.style.display = 'inline-block';
                globalScanResult.textContent = 'الماسح جاهز... يرجى توجيه الكاميرا إلى الباركود.';
            } catch (error) {
                console.error("خطأ في بدء الماسح العام (جديد):", error);
                globalScanResult.textContent = 'لا يمكن بدء الماسح: ' + (error.message || error);
                // رسالة للمستخدم إذا لم يتمكن من الوصول للكاميرا
                if (error.name === 'NotAllowedError') {
                    globalScanResult.textContent = 'تم رفض الوصول إلى الكاميرا. يرجى السماح بالوصول في إعدادات المتصفح.';
                } else if (error.name === 'NotFoundError') {
                    globalScanResult.textContent = 'لم يتم العثور على كاميرا متصلة.';
                }
            }
        });
    }

    // إيقاف الماسح الضوئي
    if (globalStopScannerBtn) {
        globalStopScannerBtn.addEventListener('click', () => {
            if (globalQrScanner) {
                globalQrScanner.stop();
                globalStartScannerBtn.style.display = 'inline-block';
                globalStopScannerBtn.style.display = 'none';
                globalScanResult.textContent = 'الماسح متوقف.';
            }
        });
    }

    // معالجة الإدخال اليدوي للباركود في الماسح العام
    if (globalProcessManualBarcodeBtn) {
        globalProcessManualBarcodeBtn.addEventListener('click', () => {
            const barcode = globalManualBarcodeInput.value;
            if (barcode) {
                if (targetInputForBarcode) {
                    const inputElement = document.getElementById(targetInputForBarcode);
                    if (inputElement) {
                        inputElement.value = barcode;
                        if (inputElement.id === 'productSearch' || inputElement.id === 'posProductSearch') {
                            inputElement.dispatchEvent(new Event('input'));
                        }
                    }
                }
                closeGlobalScanner(); // إغلاق الماسح بعد التطبيق اليدوي
            } else {
                alert('يرجى إدخال باركود يدوياً.');
            }
        });
    }
}

// مستمعي الأحداث لأزرار "مسح باركود" في جميع الصفحات
document.querySelectorAll('.open-scanner-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const targetInputId = e.currentTarget.dataset.targetInput;
        openGlobalScanner(targetInputId);
    });
});


// ----------------------------------------------------------------------
// 4. منطق المصادقة (Authentication Logic)
// ----------------------------------------------------------------------

const currentPageFileName = window.location.pathname.split('/').pop();

// التعامل مع صفحة تسجيل الدخول (login.html)
if (currentPageFileName === 'login.html' || currentPageFileName === '') {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm['username'].value;
            const password = loginForm['password'].value;
            const loginMessage = document.getElementById('loginMessage');

            try {
                await auth.signInWithEmailAndPassword(email, password); // استخدام auth.signInWithEmailAndPassword
                showMessage('loginMessage', 'تم تسجيل الدخول بنجاح!', false);
            } catch (error) {
                console.error("خطأ في تسجيل الدخول:", error);
                let errorMessage = "حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.";
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    errorMessage = "اسم المستخدم أو كلمة المرور غير صحيحة.";
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = "صيغة البريد الإلكتروني غير صحيحة.";
                } else if (error.code === 'auth/network-request-failed') {
                    errorMessage = "خطأ في الاتصال بالإنترنت. يرجى التحقق من اتصالك.";
                }
                showMessage('loginMessage', errorMessage);
            }
        });
    }
}

// التعامل مع تسجيل الخروج
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await auth.signOut(); // استخدام auth.signOut()
        } catch (error) {
            console.error("خطأ في تسجيل الخروج:", error);
            alert('حدث خطأ أثناء تسجيل الخروج. يرجى المحاولة مرة أخرى.');
        }
    });
}

// حماية المسارات (Route Protection)
auth.onAuthStateChanged((user) => { // استخدام auth.onAuthStateChanged
    const protectedPages = ['index.html', 'inventory.html', 'pos.html', 'customers.html', 'sales_history.html', 'qr_scanner.html'];
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop();

    if (user) {
        console.log("المستخدم مسجل الدخول:", user.email);
        if (currentPage === 'login.html' || currentPath === '/' || currentPage === '') {
            redirectTo('index.html');
        }
        const userInfoSpan = document.querySelector('.user-info span');
        if (userInfoSpan) {
            userInfoSpan.textContent = `مرحباً، ${user.email.split('@')[0]}!`;
        }
    } else {
        console.log("المستخدم غير مسجل الدخول.");
        if (protectedPages.includes(currentPage)) {
            redirectTo('login.html');
        }
    }
});


// ----------------------------------------------------------------------
// 5. منطق إدارة المنتجات (Inventory Management Logic)
// ----------------------------------------------------------------------

if (currentPageFileName === 'inventory.html') {
    const addProductBtn = document.getElementById('addProductBtn');
    const productModal = document.getElementById('productModal');
    const closeModalBtn = document.querySelector('#productModal .close-button');
    const productForm = document.getElementById('productForm');
    const modalTitle = document.getElementById('modalTitle');
    const productTableBody = document.getElementById('productTableBody');
    const productSearchInput = document.getElementById('productSearch');
    const filterBySelect = document.getElementById('filterBy');

    let editingProductId = null;

    // فتح المودال لإضافة منتج جديد
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            modalTitle.textContent = 'إضافة منتج جديد';
            productForm.reset(); // مسح النموذج
            editingProductId = null; // لا يوجد منتج للتعديل حالياً
            productModal.style.display = 'flex'; // إظهار المودال
        });
    }

    // إغلاق المودال
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            productModal.style.display = 'none'; // إخفاء المودال
        });
    }

    // إغلاق المودال عند النقر خارج المحتوى
    if (productModal) {
        window.addEventListener('click', (event) => {
            if (event.target === productModal) {
                productModal.style.display = 'none';
            }
        });
    }

    // معالجة إرسال نموذج المنتج (إضافة/تعديل)
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const productData = {
                name: productForm['productName'].value,
                price: parseFloat(productForm['productPrice'].value),
                unit: productForm['productUnit'].value,
                quantity: parseInt(productForm['productQuantity'].value),
                supplier: productForm['productSupplier'].value || 'غير محدد',
                productionDate: productForm['productionDate'].value || null,
                expiryDate: productForm['expiryDate'].value || null,
                barcode: productForm['productBarcode'].value || null
            };

            try {
                if (editingProductId) {
                    await db.collection('products').doc(editingProductId).update(productData); // استخدام db.collection().doc().update()
                    alert('تم تعديل المنتج بنجاح!');
                } else {
                    await db.collection('products').add(productData); // استخدام db.collection().add()
                    alert('تم إضافة المنتج بنجاح!');
                }
                productModal.style.display = 'none';
            } catch (error) {
                console.error("خطأ في حفظ المنتج:", error);
                alert('حدث خطأ أثناء حفظ المنتج. يرجى التحقق من الكونسول.');
            }
        });
    }

    // وظيفة لعرض المنتجات من Firestore في الجدول
    async function loadProducts() {
        productTableBody.innerHTML = '<tr><td colspan="9" class="no-data-row">جارٍ تحميل المنتجات...</td></tr>';
        try {
            let productsRef = db.collection('products'); // استخدام db.collection()
            let q = productsRef.orderBy('name'); // استخدام orderBy()

            q.onSnapshot((snapshot) => { // استخدام onSnapshot()
                productTableBody.innerHTML = '';
                if (snapshot.empty) {
                    productTableBody.innerHTML = '<tr><td colspan="9" class="no-data-row">لا توجد منتجات لعرضها.</td></tr>';
                    return;
                }
                snapshot.forEach(doc => {
                    const product = doc.data();
                    const row = productTableBody.insertRow();
                    row.innerHTML = `
                        <td>${product.barcode || 'N/A'}</td>
                        <td>${product.name}</td>
                        <td>${product.price ? product.price.toFixed(2) : '0.00'}</td>
                        <td>${product.unit || 'N/A'}</td>
                        <td>${product.quantity || 0}</td>
                        <td>${product.supplier || 'N/A'}</td>
                        <td>${product.productionDate ? formatArabicDate(product.productionDate) : 'N/A'}</td>
                        <td>${product.expiryDate ? formatArabicDate(product.expiryDate) : 'N/A'}</td>
                        <td class="actions-cell">
                            <button class="btn btn-primary btn-icon edit-btn" data-id="${doc.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-danger btn-icon delete-btn" data-id="${doc.id}"><i class="fas fa-trash"></i></button>
                        </td>
                    `;
                });
                attachProductActionListeners();
            }, (error) => {
                console.error("خطأ في الاستماع للمنتجات:", error);
                productTableBody.innerHTML = '<tr><td colspan="9" class="no-data-row" style="color:var(--error-color);">حدث خطأ أثناء تحميل المنتجات.</td></tr>';
            });
        } catch (error) {
            console.error("خطأ في بدء تحميل المنتجات:", error);
            productTableBody.innerHTML = '<tr><td colspan="9" class="no-data-row" style="color:var(--error-color);">خطأ فادح في نظام تحميل المنتجات.</td></tr>';
        }
    }

    function attachProductActionListeners() {
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const productId = e.currentTarget.dataset.id;
                await editProduct(productId);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const productId = e.currentTarget.dataset.id;
                await deleteProduct(productId);
            });
        });
    }

    async function editProduct(id) {
        try {
            const docSnap = await db.collection('products').doc(id).get(); // استخدام db.collection().doc().get()
            if (docSnap.exists) {
                const product = docSnap.data();
                editingProductId = id;
                modalTitle.textContent = 'تعديل المنتج';
                productForm.reset(); // للتأكد من مسح أي بيانات سابقة
                productForm['productName'].value = product.name;
                productForm['productPrice'].value = product.price;
                productForm['productUnit'].value = product.unit;
                productForm['productQuantity'].value = product.quantity;
                productForm['productSupplier'].value = product.supplier || '';
                productForm['productionDate'].value = product.productionDate || '';
                productForm['expiryDate'].value = product.expiryDate || '';
                productForm['productBarcode'].value = product.barcode || '';
                productModal.style.display = 'flex';
            } else {
                alert('المنتج غير موجود.');
            }
        } catch (error) {
            console.error("خطأ في جلب بيانات المنتج للتعديل:", error);
            alert('حدث خطأ أثناء جلب بيانات المنتج.');
        }
    }

    async function deleteProduct(id) {
        if (confirm('هل أنت متأكد من رغبتك في حذف هذا المنتج؟')) {
            try {
                await db.collection('products').doc(id).delete(); // استخدام db.collection().doc().delete()
                alert('تم حذف المنتج بنجاح!');
            } catch (error) {
                console.error("خطأ في حذف المنتج:", error);
                alert('حدث خطأ أثناء حذف المنتج.');
            }
        }
    }

    async function applyProductFilters() {
        productTableBody.innerHTML = '<tr><td colspan="9" class="no-data-row">جارٍ البحث والفلترة...</td></tr>';
        let productsRef = db.collection('products'); // استخدام db.collection()
        let currentQuery;

        const searchTerm = productSearchInput.value.toLowerCase();
        const filterType = filterBySelect.value;

        if (filterType === 'low-stock') {
            currentQuery = productsRef.where('quantity', '<=', 20).orderBy('quantity'); // استخدام where().orderBy()
        } else if (filterType === 'expiring-soon') {
            const today = getTodayDateFormatted();
            const futureDate = new Date();
            futureDate.setMonth(new Date().getMonth() + 3);
            const futureDateFormatted = futureDate.toISOString().split('T')[0];

            currentQuery = productsRef
                .where('expiryDate', '<=', futureDateFormatted)
                .where('expiryDate', '>=', today)
                .orderBy('expiryDate', 'asc');
        } else {
            currentQuery = productsRef.orderBy('name');
        }

        currentQuery.onSnapshot((snapshot) => { // استخدام onSnapshot()
            productTableBody.innerHTML = '';
            let filteredAndSearchedProducts = [];

            if (snapshot.empty && !searchTerm) {
                productTableBody.innerHTML = '<tr><td colspan="9" class="no-data-row">لا توجد منتجات مطابقة للمعايير.</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const product = doc.data();
                const productId = doc.id;
                if (searchTerm) {
                    const productText = `${product.name || ''} ${product.barcode || ''} ${product.supplier || ''} ${product.expiryDate || ''}`.toLowerCase();
                    if (productText.includes(searchTerm)) {
                        filteredAndSearchedProducts.push({ id: productId, ...product });
                    }
                } else {
                    filteredAndSearchedProducts.push({ id: productId, ...product });
                }
            });

            if (filteredAndSearchedProducts.length === 0) {
                productTableBody.innerHTML = '<tr><td colspan="9" class="no-data-row">لا توجد منتجات مطابقة للبحث أو الفلترة.</td></tr>';
                return;
            }

            filteredAndSearchedProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            filteredAndSearchedProducts.forEach(({ id, ...product }) => {
                const row = productTableBody.insertRow();
                row.innerHTML = `
                    <td>${product.barcode || 'N/A'}</td>
                    <td>${product.name}</td>
                    <td>${product.price ? product.price.toFixed(2) : '0.00'}</td>
                    <td>${product.unit || 'N/A'}</td>
                    <td>${product.quantity || 0}</td>
                    <td>${product.supplier || 'N/A'}</td>
                    <td>${product.productionDate ? formatArabicDate(product.productionDate) : 'N/A'}</td>
                    <td>${product.expiryDate ? formatArabicDate(product.expiryDate) : 'N/A'}</td>
                    <td class="actions-cell">
                        <button class="btn btn-primary btn-icon edit-btn" data-id="${id}"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-icon delete-btn" data-id="${id}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
            });
            attachProductActionListeners();
        }, (error) => {
            console.error("خطأ في البحث/الفلترة في Firestore:", error);
            productTableBody.innerHTML = '<tr><td colspan="9" class="no-data-row" style="color:var(--error-color);">حدث خطأ أثناء تحميل المنتجات.</td></tr>';
        });
    }

    if (productSearchInput) {
        productSearchInput.addEventListener('input', applyProductFilters);
    }
    if (filterBySelect) {
        filterBySelect.addEventListener('change', applyProductFilters);
    }

    applyProductFilters();
}


// ----------------------------------------------------------------------
// 6. منطق لوحة التحكم (Dashboard Logic) - تم تحسين التقارير الوهمية
// ----------------------------------------------------------------------

if (currentPageFileName === 'index.html') {
    const lowStockCardValue = document.getElementById('lowStockCount');
    if (lowStockCardValue) {
        db.collection('products').where('quantity', '<=', 20).onSnapshot((snapshot) => {
            lowStockCardValue.textContent = snapshot.size;
        }, error => {
            console.error("Error getting low stock products:", error);
            lowStockCardValue.textContent = 'خطأ';
        });
    }

    const expiringSoonCardValue = document.getElementById('expiringCount');
    if (expiringSoonCardValue) {
        const today = getTodayDateFormatted();
        const futureDate = new Date();
        futureDate.setMonth(new Date().getMonth() + 3);
        const futureDateFormatted = futureDate.toISOString().split('T')[0];

        db.collection('products')
            .where('expiryDate', '<=', futureDateFormatted)
            .where('expiryDate', '>=', today)
            .orderBy('expiryDate', 'asc')
            .onSnapshot((snapshot) => {
                expiringSoonCardValue.textContent = snapshot.size;
            }, error => {
                console.error("Error getting expiring products:", error);
                expiringSoonCardValue.textContent = 'خطأ';
            });
    }

    // --- تحديث لتقارير المبيعات (ستعمل الآن إذا كانت هناك بيانات مبيعات في Firestore) ---
    const todaySalesElement = document.getElementById('todaySales');
    const todayInvoicesElement = document.getElementById('todayInvoices');
    const reportTopSellingElement = document.getElementById('reportTopSelling');

    if (todaySalesElement) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        db.collection('sales')
            .where('timestamp', '>=', startOfDay)
            .where('timestamp', '<=', endOfDay)
            .onSnapshot((snapshot) => {
                let totalSales = 0;
                snapshot.forEach(doc => {
                    totalSales += doc.data().grandTotal || 0; // استخدم grandTotal للفاتورة
                });
                todaySalesElement.textContent = `${totalSales.toFixed(2)} جنيه`;
                todayInvoicesElement.textContent = snapshot.size;
            }, (error) => {
                console.error("Error fetching daily sales:", error);
                todaySalesElement.textContent = 'خطأ';
                todayInvoicesElement.textContent = 'خطأ';
            });
    }
    // نهاية تحديث تقارير المبيعات (ستعمل بشكل كامل عند إضافة بيانات مبيعات حقيقية من POS)

    const ctx = document.getElementById('salesChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
                datasets: [{
                    label: 'إجمالي المبيعات',
                    data: [1200, 1900, 3000, 5000, 2300, 1700, 3500], // بيانات وهمية حالياً
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
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'المبيعات (جنيه)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'الأيام'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

// ----------------------------------------------------------------------
// 7. منطق نقطة البيع (POS Logic) - تم تفعيل البحث عن المنتجات
// ----------------------------------------------------------------------
if (currentPageFileName === 'pos.html') {
    const posProductSearchInput = document.getElementById('posProductSearch');
    const posSearchResultsDiv = document.getElementById('posSearchResults');
    const posScanBarcodeBtn = document.getElementById('posScanBarcodeBtn');

    if (posScanBarcodeBtn) {
        posScanBarcodeBtn.addEventListener('click', () => {
            openGlobalScanner('posProductSearch'); // يوجه النتيجة إلى حقل البحث في نقطة البيع
        });
    }

    const paymentTypeSelect = document.getElementById('paymentType');
    const paidAmountGroup = document.getElementById('paidAmountGroup');
    if (paymentTypeSelect) {
        paymentTypeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'partial') {
                paidAmountGroup.style.display = 'block';
            } else {
                paidAmountGroup.style.display = 'none';
            }
        });
    }

    // --- منطق البحث عن المنتجات في نقطة البيع ---
    if (posProductSearchInput) {
        let searchTimeout;
        posProductSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchProductsForPOS(posProductSearchInput.value);
            }, 300); // تأخير 300 مللي ثانية للبحث
        });
    }

    async function searchProductsForPOS(searchTerm) {
        posSearchResultsDiv.innerHTML = '<p class="no-data-row">جارٍ البحث عن المنتجات...</p>';
        if (!searchTerm) {
            posSearchResultsDiv.innerHTML = '<p class="no-data-row">ابحث عن منتج لإضافته للفاتورة.</p>';
            return;
        }

        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        let productsRef = db.collection('products'); // استخدام db.collection()

        try {
            // استخدام get() بدلاً من onSnapshot هنا للحصول على لقطة واحدة لنتائج البحث
            const snapshot = await productsRef.orderBy('name').get(); // استخدام productsRef.orderBy().get()

            let results = [];
            snapshot.forEach(doc => {
                const product = doc.data();
                const productText = `${product.name || ''} ${product.barcode || ''}`.toLowerCase();
                if (productText.includes(lowerCaseSearchTerm)) {
                    results.push({ id: doc.id, ...product });
                }
            });

            if (results.length === 0) {
                posSearchResultsDiv.innerHTML = '<p class="no-data-row">لا توجد منتجات مطابقة لـ "'+ searchTerm +'".</p>';
                return;
            }

            posSearchResultsDiv.innerHTML = ''; // مسح الرسالة التحميل
            results.forEach(product => {
                const productResultDiv = document.createElement('div');
                productResultDiv.classList.add('product-item-result');
                productResultDiv.innerHTML = `
                    <span>${product.name} - ${product.price ? product.price.toFixed(2) : '0.00'} جنيه/${product.unit || 'وحدة'}</span>
                    <div class="product-item-controls">
                        <input type="number" value="1" min="1" class="item-quantity-pos" data-max-quantity="${product.quantity}">
                        <select class="item-unit-pos">
                            <option value="${product.unit || 'وحدة'}">${product.unit || 'وحدة'}</option>
                            </select>
                        <button class="btn btn-primary btn-sm add-to-cart-btn"
                                data-product-id="${product.id}"
                                data-product-name="${product.name}"
                                data-product-price="${product.price}"
                                data-product-unit="${product.unit || 'وحدة'}">
                            <i class="fas fa-cart-plus"></i>
                        </button>
                    </div>
                `;
                posSearchResultsDiv.appendChild(productResultDiv);
            });
            attachAddToCartListeners(); // إضافة مستمعات لأزرار الإضافة إلى الفاتورة
        } catch (error) {
            console.error("خطأ في البحث عن المنتجات لنقطة البيع:", error);
            posSearchResultsDiv.innerHTML = '<p class="no-data-row" style="color:var(--error-color);">حدث خطأ أثناء البحث عن المنتجات.</p>';
        }
    }

    let currentInvoiceItems = []; // مصفوفة لتخزين عناصر الفاتورة
    const invoiceItemsBody = document.getElementById('invoiceItemsBody');
    const subTotalSpan = document.getElementById('subTotal');
    const grandTotalSpan = document.getElementById('grandTotal');
    const discountInput = document.getElementById('discount');
    const taxInput = document.getElementById('tax');

    function attachAddToCartListeners() {
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.currentTarget.dataset.productId;
                const productName = e.currentTarget.dataset.productName;
                const productPrice = parseFloat(e.currentTarget.dataset.productPrice);
                const productUnit = e.currentTarget.dataset.productUnit;
                const quantityInput = e.currentTarget.closest('.product-item-controls').querySelector('.item-quantity-pos');
                const quantity = parseInt(quantityInput.value);
                const maxQuantity = parseInt(quantityInput.dataset.maxQuantity); // الكمية المتاحة في المخزون

                if (quantity <= 0) {
                    alert('الكمية يجب أن تكون أكبر من صفر.');
                    return;
                }
                if (quantity > maxQuantity) {
                    alert(`الكمية المطلوبة (${quantity}) أكبر من الكمية المتاحة في المخزون (${maxQuantity}).`);
                    return;
                }

                addToInvoice({ id: productId, name: productName, price: productPrice, unit: productUnit, quantity: quantity });
            });
        });
    }


    function addToInvoice(item) {
        const existingItemIndex = currentInvoiceItems.findIndex(i => i.id === item.id && i.unit === item.unit);
        if (existingItemIndex > -1) {
            currentInvoiceItems[existingItemIndex].quantity += item.quantity;
        } else {
            currentInvoiceItems.push(item);
        }
        renderInvoiceItems();
        calculateInvoiceTotals();
    }

    function renderInvoiceItems() {
        if (currentInvoiceItems.length === 0) {
            invoiceItemsBody.innerHTML = '<tr><td colspan="6" class="no-data-row">لم يتم إضافة أي منتجات بعد.</td></tr>';
            return;
        }

        invoiceItemsBody.innerHTML = '';
        currentInvoiceItems.forEach((item, index) => {
            const row = invoiceItemsBody.insertRow();
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.unit}</td>
                <td>${item.quantity}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${(item.quantity * item.price).toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger btn-sm remove-from-invoice-btn" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        });
        document.querySelectorAll('.remove-from-invoice-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const indexToRemove = parseInt(e.currentTarget.dataset.index);
                currentInvoiceItems.splice(indexToRemove, 1);
                renderInvoiceItems();
                calculateInvoiceTotals();
            });
        });
    }

    function calculateInvoiceTotals() {
        let subTotal = currentInvoiceItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        let discount = parseFloat(discountInput.value) || 0;
        let tax = parseFloat(taxInput.value) || 0;

        let totalAfterDiscount;
        if (discountInput.value.includes('%')) {
             totalAfterDiscount = subTotal * (1 - (discount / 100));
        } else {
             totalAfterDiscount = subTotal - discount;
        }


        let grandTotal = totalAfterDiscount * (1 + (tax / 100));

        subTotalSpan.textContent = grandTotal.toFixed(2); // تم تعديل هذا ليظهر الإجمالي بعد الخصم والضريبة
        grandTotalSpan.textContent = grandTotal.toFixed(2); // الإجمالي النهائي
    }

    discountInput.addEventListener('input', calculateInvoiceTotals);
    taxInput.addEventListener('input', calculateInvoiceTotals);

    const completeSaleBtn = document.getElementById('completeSaleBtn');
    if (completeSaleBtn) {
        completeSaleBtn.addEventListener('click', async () => {
            if (currentInvoiceItems.length === 0) {
                alert('لا توجد منتجات في الفاتورة لإتمام البيع.');
                return;
            }
            if (!confirm('هل أنت متأكد من إتمام عملية البيع؟')) {
                return;
            }

            try {
                // 1. توليد رقم فاتورة فريد (مثال بسيط)
                const invoiceNumber = `INV-${Date.now()}`;

                // 2. تحديث المخزون
                for (const item of currentInvoiceItems) {
                    const productRef = db.collection('products').doc(item.id); // استخدام db.collection().doc()
                    const productSnap = await productRef.get(); // استخدام .get()
                    if (productSnap.exists) {
                        const currentQuantity = productSnap.data().quantity;
                        const newQuantity = currentQuantity - item.quantity;
                        if (newQuantity < 0) {
                            alert(`خطأ: الكمية المتاحة من ${item.name} غير كافية.`);
                            return; // إلغاء العملية كلها إذا كان هناك نقص
                        }
                        await productRef.update({ quantity: newQuantity }); // استخدام productRef.update()
                    } else {
                        alert(`خطأ: المنتج ${item.name} لم يعد موجوداً في المخزون.`);
                        return;
                    }
                }

                // 3. حفظ الفاتورة في Firestore
                const invoiceData = {
                    invoiceNumber: invoiceNumber,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(), // وقت وتاريخ البيع من خادم Firebase
                    items: currentInvoiceItems,
                    subTotal: parseFloat(subTotalSpan.textContent),
                    discount: parseFloat(discountInput.value) || 0,
                    tax: parseFloat(taxInput.value) || 0,
                    grandTotal: parseFloat(grandTotalSpan.textContent),
                    paymentType: paymentTypeSelect.value,
                    paidAmount: paymentTypeSelect.value === 'partial' ? parseFloat(document.getElementById('paidAmount').value) : parseFloat(grandTotalSpan.textContent),
                    customer: document.getElementById('customerSelect').value || null, // ربط بالعميل
                    status: paymentTypeSelect.value === 'credit' ? 'آجل' : 'مدفوع' // حالة الفاتورة
                };
                await db.collection('sales').add(invoiceData); // استخدام db.collection().add()

                alert('تم إتمام البيع وحفظ الفاتورة بنجاح!');
                currentInvoiceItems = []; // مسح الفاتورة بعد البيع
                renderInvoiceItems();
                calculateInvoiceTotals();
                posProductSearchInput.value = ''; // مسح البحث
                posSearchResultsDiv.innerHTML = '<p class="no-data-row">ابحث عن منتج لإضافته للفاتورة.</p>';
            } catch (error) {
                console.error("خطأ في إتمام البيع:", error);
                alert('حدث خطأ فادح أثناء إتمام البيع. يرجى التحقق من الكونسول.');
            }
        });
    }
}

// ----------------------------------------------------------------------
// 8. منطق إدارة العملاء (Customer Management Logic) - تم إصلاح فتح المودال التلقائي
// ----------------------------------------------------------------------
if (currentPageFileName === 'customers.html') {
    const addCustomerBtn = document.getElementById('addCustomerBtn');
    const customerModal = document.getElementById('customerModal');
    const closeCustomerModalBtn = document.querySelector('#customerModal .close-button');

    const payDebtModal = document.getElementById('payDebtModal');
    const closePayDebtModalBtn = document.querySelector('#payDebtModal .close-button');

    const customerInvoicesModal = document.getElementById('customerInvoicesModal');
    const closeCustomerInvoicesModalBtn = document.querySelector('#customerInvoicesModal .close-button');

    const customerForm = document.getElementById('customerForm');
    const customerTableBody = document.getElementById('customerTableBody');

    let editingCustomerId = null;

    // فتح مودال إضافة/تعديل العميل
    if (addCustomerBtn) {
        addCustomerBtn.addEventListener('click', () => {
            document.getElementById('customerModalTitle').textContent = 'إضافة عميل جديد';
            customerForm.reset();
            editingCustomerId = null;
            customerModal.style.display = 'flex';
        });
    }

    // إغلاق مودال إضافة/تعديل العميل
    if (closeCustomerModalBtn) {
        closeCustomerModalBtn.addEventListener('click', () => {
            customerModal.style.display = 'none';
        });
    }
    if (customerModal) {
        window.addEventListener('click', (event) => {
            if (event.target === customerModal) {
                customerModal.style.display = 'none';
            }
        });
    }

    // إغلاق مودال سداد الدين
    if (closePayDebtModalBtn) {
        closePayDebtModalBtn.addEventListener('click', () => {
            payDebtModal.style.display = 'none';
        });
    }
    if (payDebtModal) {
        window.addEventListener('click', (event) => {
            if (event.target === payDebtModal) {
                payDebtModal.style.display = 'none';
            }
        });
    }

    // إغلاق مودال فواتير العميل
    if (closeCustomerInvoicesModalBtn) {
        closeCustomerInvoicesModalBtn.addEventListener('click', () => {
            customerInvoicesModal.style.display = 'none';
        });
    }
    if (customerInvoicesModal) {
        window.addEventListener('click', (event) => {
            if (event.target === customerInvoicesModal) {
                customerInvoicesModal.style.display = 'none';
            }
        });
    }

    // --- منطق إدارة العملاء (CRUD، عرض، بحث، فلترة) ---
    if (customerForm) {
        customerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const customerData = {
                name: customerForm['customerName'].value,
                phone: customerForm['customerPhone'].value || null,
                address: customerForm['customerAddress'].value || null,
                notes: customerForm['customerNotes'].value || null,
                currentDebt: 0, // الدين الافتراضي لعميل جديد
                invoiceCount: 0, // عدد الفواتير الافتراضي
                lastTransaction: null // آخر معاملة
            };

            try {
                if (editingCustomerId) {
                    await db.collection('customers').doc(editingCustomerId).update(customerData);
                    alert('تم تعديل العميل بنجاح!');
                } else {
                    await db.collection('customers').add(customerData);
                    alert('تم إضافة العميل بنجاح!');
                }
                customerModal.style.display = 'none';
                loadCustomers(); // إعادة تحميل العملاء بعد الحفظ
            } catch (error) {
                console.error("خطأ في حفظ العميل:", error);
                alert('حدث خطأ أثناء حفظ العميل. يرجى التحقق من الكونسول.');
            }
        });
    }

    async function loadCustomers() {
        customerTableBody.innerHTML = '<tr><td colspan="7" class="no-data-row">جارٍ تحميل العملاء...</td></tr>';
        try {
            db.collection('customers').orderBy('name').onSnapshot((snapshot) => { // استخدام db.collection().orderBy().onSnapshot()
                customerTableBody.innerHTML = '';
                if (snapshot.empty) {
                    customerTableBody.innerHTML = '<tr><td colspan="7" class="no-data-row">لا توجد بيانات عملاء لعرضها.</td></tr>';
                    return;
                }
                snapshot.forEach(doc => {
                    const customer = doc.data();
                    const row = customerTableBody.insertRow();
                    row.innerHTML = `
                        <td>${customer.name}</td>
                        <td>${customer.phone || 'N/A'}</td>
                        <td>${customer.address || 'N/A'}</td>
                        <td>${(customer.currentDebt || 0).toFixed(2)} جنيه</td>
                        <td>${customer.invoiceCount || 0}</td>
                        <td>${customer.lastTransaction ? formatArabicDate(new Date(customer.lastTransaction.toDate()).toISOString().split('T')[0]) : 'N/A'}</td>
                        <td class="actions-cell">
                            <button class="btn btn-primary btn-icon edit-customer-btn" data-id="${doc.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-secondary btn-icon pay-debt-btn" data-id="${doc.id}" data-name="${customer.name}" data-debt="${customer.currentDebt || 0}"><i class="fas fa-hand-holding-usd"></i> سداد</button>
                            <button class="btn btn-info btn-icon view-invoices-btn" data-id="${doc.id}" data-name="${customer.name}"><i class="fas fa-file-invoice"></i> فواتير</button>
                            <button class="btn btn-danger btn-icon delete-customer-btn" data-id="${doc.id}"><i class="fas fa-trash"></i></button>
                        </td>
                    `;
                });
                attachCustomerActionListeners();
            }, (error) => {
                console.error("خطأ في تحميل العملاء:", error);
                customerTableBody.innerHTML = '<tr><td colspan="7" class="no-data-row" style="color:var(--error-color);">حدث خطأ أثناء تحميل العملاء.</td></tr>';
            });
        } catch (error) {
            console.error("خطأ في بدء تحميل العملاء:", error);
            customerTableBody.innerHTML = '<tr><td colspan="7" class="no-data-row" style="color:var(--error-color);">خطأ فادح في نظام تحميل العملاء.</td></tr>';
        }
    }

    function attachCustomerActionListeners() {
        document.querySelectorAll('.edit-customer-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const customerId = e.currentTarget.dataset.id;
                await editCustomer(customerId);
            });
        });

        document.querySelectorAll('.delete-customer-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const customerId = e.currentTarget.dataset.id;
                await deleteCustomer(customerId);
            });
        });

        document.querySelectorAll('.pay-debt-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const customerId = e.currentTarget.dataset.id;
                const customerName = e.currentTarget.dataset.name;
                const customerDebt = parseFloat(e.currentTarget.dataset.debt);
                openPayDebtModal(customerId, customerName, customerDebt);
            });
        });

        document.querySelectorAll('.view-invoices-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const customerId = e.currentTarget.dataset.id;
                const customerName = e.currentTarget.dataset.name;
                await openCustomerInvoicesModal(customerId, customerName);
            });
        });
    }

    async function editCustomer(id) {
        try {
            const docSnap = await db.collection('customers').doc(id).get(); // استخدام db.collection().doc().get()
            if (docSnap.exists) {
                const customer = docSnap.data();
                editingCustomerId = id;
                document.getElementById('customerModalTitle').textContent = 'تعديل بيانات العميل';
                customerForm.reset();
                customerForm['customerName'].value = customer.name;
                customerForm['customerPhone'].value = customer.phone || '';
                customerForm['customerAddress'].value = customer.address || '';
                customerForm['customerNotes'].value = customer.notes || '';
                customerModal.style.display = 'flex';
            } else {
                alert('العميل غير موجود.');
            }
        } catch (error) {
            console.error("خطأ في جلب بيانات العميل للتعديل:", error);
            alert('حدث خطأ أثناء جلب بيانات العميل.');
        }
    }

    async function deleteCustomer(id) {
        if (confirm('هل أنت متأكد من رغبتك في حذف هذا العميل؟ سيتم حذف جميع بياناته وديونه.')) {
            try {
                await db.collection('customers').doc(id).delete(); // استخدام db.collection().doc().delete()
                alert('تم حذف العميل بنجاح!');
            } catch (error) {
                console.error("خطأ في حذف العميل:", error);
                alert('حدث خطأ أثناء حذف العميل.');
            }
        }
    }

    // منطق سداد الدين
    const payDebtForm = document.getElementById('payDebtForm');
    let currentPayDebtCustomerId = null;
    if (payDebtForm) {
        payDebtForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amountToPay = parseFloat(payDebtForm['debtAmountToPay'].value);
            if (isNaN(amountToPay) || amountToPay <= 0) {
                alert('يرجى إدخال مبلغ صحيح لسداده.');
                return;
            }

            try {
                const customerRef = db.collection('customers').doc(currentPayDebtCustomerId); // استخدام db.collection().doc()
                const customerSnap = await customerRef.get(); // استخدام .get()
                if (customerSnap.exists) {
                    const currentDebt = customerSnap.data().currentDebt || 0;
                    const newDebt = currentDebt - amountToPay;
                    if (newDebt < 0) {
                        alert('المبلغ المدفوع أكبر من الدين المستحق. سيتم سداد الدين بالكامل.');
                        await customerRef.update({ currentDebt: 0 }); // استخدام .update()
                    } else {
                        await customerRef.update({ currentDebt: newDebt });
                    }
                    alert('تم سداد الدين بنجاح!');
                    payDebtModal.style.display = 'none';
                    loadCustomers(); // تحديث قائمة العملاء
                } else {
                    alert('العميل غير موجود.');
                }
            } catch (error) {
                console.error("خطأ في سداد الدين:", error);
                alert('حدث خطأ أثناء سداد الدين.');
            }
        });
    }

    function openPayDebtModal(customerId, customerName, customerDebt) {
        currentPayDebtCustomerId = customerId;
        document.getElementById('debtCustomerName').textContent = customerName;
        document.getElementById('currentCustomerDebt').textContent = customerDebt.toFixed(2);
        document.getElementById('debtAmountToPay').value = ''; // مسح حقل المبلغ المدفوع
        payDebtModal.style.display = 'flex';
    }

    // منطق عرض فواتير العميل (هذا مودال وليس صفحة جديدة)
    const customerInvoicesBody = document.getElementById('customerInvoicesBody');
    async function openCustomerInvoicesModal(customerId, customerName) {
        document.getElementById('invoicesCustomerName').textContent = customerName;
        customerInvoicesBody.innerHTML = '<tr><td colspan="4" class="no-data-row">جارٍ تحميل فواتير العميل...</td></tr>';

        try {
            const q = db.collection('sales').where('customer', '==', customerId).orderBy('timestamp', 'desc'); // استخدام db.collection().where().orderBy()
            const snapshot = await q.get(); // استخدام .get()

            customerInvoicesBody.innerHTML = '';
            if (snapshot.empty) {
                customerInvoicesBody.innerHTML = '<tr><td colspan="4" class="no-data-row">لا توجد فواتير لهذا العميل.</td></tr>';
            } else {
                snapshot.forEach(doc => {
                    const invoice = doc.data();
                    const row = customerInvoicesBody.insertRow();
                    // Timestamp من Firebase يتم تحويله إلى Date object
                    const invoiceDate = invoice.timestamp ? formatArabicDate(new Date(invoice.timestamp.toDate()).toISOString().split('T')[0]) : 'N/A';
                    row.innerHTML = `
                        <td>${invoice.invoiceNumber || 'N/A'}</td>
                        <td>${invoiceDate}</td>
                        <td>${(invoice.grandTotal || 0).toFixed(2)} جنيه</td>
                        <td><button class="btn btn-secondary btn-sm view-invoice-details-btn" data-invoice-id="${doc.id}"><i class="fas fa-info-circle"></i> تفاصيل</button></td>
                    `;
                });
                // هنا يمكن إضافة مستمعات لزر "تفاصيل" لفتح مودال تفاصيل الفاتورة
            }
            customerInvoicesModal.style.display = 'flex'; // إظهار المودال
        } catch (error) {
            console.error("خطأ في تحميل فواتير العميل:", error);
            customerInvoicesBody.innerHTML = '<tr><td colspan="4" class="no-data-row" style="color:var(--error-color);">حدث خطأ أثناء تحميل الفواتير.</td></tr>';
        }
    }

    // استدعاء تحميل العملاء عند تحميل الصفحة
    loadCustomers();
}

// ----------------------------------------------------------------------
// 9. منطق سجل المبيعات (Sales History Logic) - سيتم تطويره لاحقاً
// ----------------------------------------------------------------------
if (currentPageFileName === 'sales_history.html') {
    console.log("صفحة سجل المبيعات جاهزة، المنطق سيكتب هنا.");
    // هذا هو المكان المناسب لعرض كل فواتير المبيعات
    // وربطها بخيارات الفلترة حسب التاريخ
}

// ----------------------------------------------------------------------
// 10. منطق ماسح الباركود (QR Scanner Page Logic) - تم تحسينه
// ----------------------------------------------------------------------
// هذه الصفحة هي الصفحة المخصصة للماسح الضوئي، وليست المودال العام.
if (currentPageFileName === 'qr_scanner.html') {
    console.log("صفحة ماسح الباركود مخصصة جاهزة، المنطق سيكتب هنا.");
    const qrVideoPage = document.getElementById('qr-video');
    const scanResultPage = document.getElementById('scan-result');
    const startScannerBtnPage = document.getElementById('startScannerBtn');
    const stopScannerBtnPage = document.getElementById('stopScannerBtn');
    const manualBarcodeInputPage = document.getElementById('manualBarcodeInput');
    const processManualBarcodeBtnPage = document.getElementById('processManualBarcodeBtn');

    let pageQrScanner = null;

    if (startScannerBtnPage) {
        startScannerBtnPage.addEventListener('click', async () => {
            if (!qrVideoPage) {
                scanResultPage.textContent = 'خطأ: عنصر الفيديو غير موجود.';
                console.error('Video element #qr-video not found on scanner page.');
                return;
            }
            if (pageQrScanner) { // إذا كان موجوداً، أعد تشغيله
                 try {
                    await pageQrScanner.start();
                    startScannerBtnPage.style.display = 'none';
                    stopScannerBtnPage.style.display = 'inline-block';
                    scanResultPage.textContent = 'الماسح جاهز... يرجى توجيه الكاميرا إلى الباركود.';
                } catch (error) {
                    console.error("خطأ في بدء الماسح الخاص بالصفحة (موجود):", error);
                    scanResultPage.textContent = 'لا يمكن بدء الماسح: ' + (error.message || error);
                }
                return;
            }

            // إنشاء ماسح جديد للصفحة
            try {
                // QrScanner يجب أن تكون متاحة عالمياً هنا لأنها حملت كسكربت عادي في HTML
                pageQrScanner = new QrScanner(
                    qrVideoPage,
                    result => {
                        const barcode = result.data;
                        scanResultPage.textContent = `تم مسح: ${barcode}`;
                        console.log('Scanned barcode on QR Scanner Page:', barcode);
                        manualBarcodeInputPage.value = barcode;
                        // pageQrScanner.stop(); // يمكن إيقاف الماسح بعد أول مسح أو تركه مستمرًا
                        // startScannerBtnPage.style.display = 'inline-block';
                        // stopScannerBtnPage.style.display = 'none';
                    },
                    {
                        onDecodeError: error => {
                            // console.warn(error);
                        },
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                    }
                );
                await pageQrScanner.start();
                startScannerBtnPage.style.display = 'none';
                stopScannerBtnPage.style.display = 'inline-block';
                scanResultPage.textContent = 'الماسح جاهز... يرجى توجيه الكاميرا إلى الباركود.';
            } catch (error) {
                console.error("خطأ في بدء الماسح الخاص بالصفحة (جديد):", error);
                scanResultPage.textContent = 'لا يمكن بدء الماسح: ' + (error.message || error);
                if (error.name === 'NotAllowedError') {
                    scanResultPage.textContent = 'تم رفض الوصول إلى الكاميرا. يرجى السماح بالوصول في إعدادات المتصفح.';
                } else if (error.name === 'NotFoundError') {
                    scanResultPage.textContent = 'لم يتم العثور على كاميرا متصلة.';
                }
            }
        });
    }

    if (stopScannerBtnPage) {
        stopScannerBtnPage.addEventListener('click', () => {
            if (pageQrScanner) {
                pageQrScanner.stop();
                startScannerBtnPage.style.display = 'inline-block';
                stopScannerBtnPage.style.display = 'none';
                scanResultPage.textContent = 'الماسح متوقف.';
            }
        });
    }

    if (processManualBarcodeBtnPage) {
        processManualBarcodeBtnPage.addEventListener('click', () => {
            const barcode = manualBarcodeInputPage.value;
            if (barcode) {
                scanResultPage.textContent = `تم إدخال الباركود يدوياً: ${barcode}`;
                alert(`تم إدخال الباركود يدوياً في صفحة الماسح: ${barcode}.`);
            } else {
                alert('يرجى إدخال باركود.');
            }
        });
    }

    // تأكد من إيقاف الماسح عند مغادرة الصفحة أو عند إغلاق المتصفح
    window.addEventListener('beforeunload', () => {
        if (pageQrScanner) {
            pageQrScanner.destroy(); // تحرير موارد الكاميرا
        }
    });
}
