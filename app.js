// Invoice App - Clean Version
console.log('App.js loading...');

var currentInvoice = null;
var productRowCount = 0;
var isEditMode = false;

// Wait for both DOM and database to be ready
var dbReady = false;
var domReady = false;

window.addEventListener('dbInitialized', function() {
    console.log('Database ready event received');
    dbReady = true;
    if (domReady) initializeApp();
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    domReady = true;
    if (dbReady) initializeApp();
});

function initializeApp() {
    console.log('Initializing app...');
    try {
        document.getElementById('invoiceDate').valueAsDate = new Date();
        invoiceDB.getLastInvoiceNumber().then(function(invoiceNo) {
            document.getElementById('invoiceNo').value = invoiceNo;
        }).catch(function() {
            document.getElementById('invoiceNo').value = 'SE-0001';
        });
        addProductRow();
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        document.getElementById('invoiceDate').valueAsDate = new Date();
        document.getElementById('invoiceNo').value = 'SE-0001';
        addProductRow();
    }
}

function showSection(section) {
    console.log('showSection called with:', section);
    var sections = document.querySelectorAll('.section');
    var buttons = document.querySelectorAll('.nav-btn');
    
    for (var i = 0; i < sections.length; i++) {
        sections[i].classList.remove('active');
    }
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('active');
    }
    
    if (section === 'create') {
        document.getElementById('createSection').classList.add('active');
        document.getElementById('createBtn').classList.add('active');
    } else if (section === 'search') {
        document.getElementById('searchSection').classList.add('active');
        document.getElementById('searchBtn').classList.add('active');
        loadAllInvoices();
    } else if (section === 'analytics') {
        document.getElementById('analyticsSection').classList.add('active');
        document.getElementById('analyticsBtn').classList.add('active');
        loadAnalytics();
    } else if (section === 'settings') {
        document.getElementById('settingsSection').classList.add('active');
        document.getElementById('settingsBtn').classList.add('active');
        loadSettings();
    }
    console.log('Section changed to:', section);
}

function addProductRow() {
    productRowCount++;
    var tbody = document.getElementById('productTableBody');
    var row = document.createElement('tr');
    row.id = 'row-' + productRowCount;
    
    row.innerHTML = '<td>' + productRowCount + '</td>' +
        '<td><input type="text" class="product-desc" placeholder="Product description"></td>' +
        '<td><input type="text" class="product-hsn" placeholder="HSN/SAN"></td>' +
        '<td><input type="number" class="product-gst" value="18" min="0" max="100" onchange="calculateRow(' + productRowCount + ')"></td>' +
        '<td><input type="number" class="product-qty" value="1" min="1" onchange="calculateRow(' + productRowCount + ')"></td>' +
        '<td><input type="number" class="product-rate" value="0" min="0" step="0.01" onchange="calculateRow(' + productRowCount + ')"></td>' +
        '<td><span class="product-amount">₹0.00</span></td>' +
        '<td><button class="btn-remove" onclick="removeProductRow(' + productRowCount + ')">Remove</button></td>';
    
    tbody.appendChild(row);
}

function removeProductRow(rowId) {
    var row = document.getElementById('row-' + rowId);
    if (row) {
        row.remove();
        calculateTotals();
        renumberRows();
    }
}

function renumberRows() {
    var rows = document.querySelectorAll('#productTableBody tr');
    for (var i = 0; i < rows.length; i++) {
        rows[i].querySelector('td:first-child').textContent = i + 1;
    }
}

function calculateRow(rowId) {
    var row = document.getElementById('row-' + rowId);
    var qty = parseFloat(row.querySelector('.product-qty').value) || 0;
    var rate = parseFloat(row.querySelector('.product-rate').value) || 0;
    var amount = qty * rate;
    
    row.querySelector('.product-amount').textContent = '₹' + amount.toFixed(2);
    calculateTotals();
}

function calculateTotals() {
    var rows = document.querySelectorAll('#productTableBody tr');
    var subtotal = 0;
    var totalCGST = 0;
    var totalSGST = 0;
    
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var qty = parseFloat(row.querySelector('.product-qty').value) || 0;
        var rate = parseFloat(row.querySelector('.product-rate').value) || 0;
        var gstRate = parseFloat(row.querySelector('.product-gst').value) || 0;
        var amount = qty * rate;
        
        subtotal += amount;
        var gstAmount = (amount * gstRate) / 100;
        totalCGST += gstAmount / 2;
        totalSGST += gstAmount / 2;
    }
    
    var grandTotal = subtotal + totalCGST + totalSGST;
    
    document.getElementById('subtotal').textContent = '₹' + subtotal.toFixed(2);
    document.getElementById('cgstAmount').textContent = '₹' + totalCGST.toFixed(2);
    document.getElementById('sgstAmount').textContent = '₹' + totalSGST.toFixed(2);
    document.getElementById('grandTotal').textContent = '₹' + grandTotal.toFixed(2);
}

function generateInvoice() {
    var customerAddress = document.getElementById('customerAddress').value.trim();
    var partyGSTIN = document.getElementById('partyGSTIN').value.trim();
    var invoiceNo = document.getElementById('invoiceNo').value.trim();
    var invoiceDate = document.getElementById('invoiceDate').value;
    
    if (!customerAddress || !invoiceNo || !invoiceDate) {
        alert('Please fill in all required fields');
        return;
    }
    
    var products = [];
    var rows = document.querySelectorAll('#productTableBody tr');
    
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var desc = row.querySelector('.product-desc').value.trim();
        var hsn = row.querySelector('.product-hsn').value.trim();
        var gst = parseFloat(row.querySelector('.product-gst').value) || 0;
        var qty = parseFloat(row.querySelector('.product-qty').value) || 0;
        var rate = parseFloat(row.querySelector('.product-rate').value) || 0;
        var amount = qty * rate;
        
        if (desc && qty > 0) {
            products.push({ slNo: i + 1, desc: desc, hsn: hsn, gst: gst, qty: qty, rate: rate, amount: amount });
        }
    }
    
    if (products.length === 0) {
        alert('Please add at least one product');
        return;
    }
    
    var subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('₹', ''));
    var cgst = parseFloat(document.getElementById('cgstAmount').textContent.replace('₹', ''));
    var sgst = parseFloat(document.getElementById('sgstAmount').textContent.replace('₹', ''));
    var grandTotal = parseFloat(document.getElementById('grandTotal').textContent.replace('₹', ''));
    
    currentInvoice = {
        invoiceNo: invoiceNo,
        date: invoiceDate,
        customerAddress: customerAddress,
        partyGSTIN: partyGSTIN,
        products: products,
        subtotal: subtotal,
        cgst: cgst,
        sgst: sgst,
        grandTotal: grandTotal,
        createdAt: new Date().toISOString()
    };
    
    // Save to database
    invoiceDB.saveInvoice(currentInvoice).then(function() {
        showInvoicePreview();
    }).catch(function(error) {
        console.error('Error saving invoice:', error);
        showInvoicePreview();
    });
}

function fillExcelTemplate() {
    console.log('Attempting to load Excel template...');
    
    // Try to load the Excel template
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'bill format.xlsx', true);
    xhr.responseType = 'arraybuffer';
    
    xhr.onload = function(e) {
        if (xhr.status === 200) {
            try {
                console.log('Excel template loaded, processing...');
                var data = new Uint8Array(xhr.response);
                var workbook = XLSX.read(data, {type: 'array'});
                
                // Get the first sheet
                var sheetName = workbook.SheetNames[0];
                var worksheet = workbook.Sheets[sheetName];
                
                // Get company settings
                var settings = {};
                var companyName = settings.companyName || '';
                var companyAddress = settings.companyAddress || '';
                var companyGSTIN = settings.companyGSTIN || '';
                var companyMobile = settings.companyMobile || '';
                
                // Fill in the data (adjust cell references based on your Excel template)
                // You'll need to adjust these cell references to match your actual Excel template
                worksheet['A1'] = { t: 's', v: companyName };
                worksheet['A2'] = { t: 's', v: companyAddress };
                worksheet['A3'] = { t: 's', v: 'GSTIN: ' + companyGSTIN };
                worksheet['A4'] = { t: 's', v: 'Mobile: ' + companyMobile };
                
                worksheet['A6'] = { t: 's', v: 'Invoice No: ' + currentInvoice.invoiceNo };
                worksheet['B6'] = { t: 's', v: 'Date: ' + formatDate(currentInvoice.date) };
                
                worksheet['A8'] = { t: 's', v: 'Name & Address:' };
                worksheet['A9'] = { t: 's', v: currentInvoice.customerAddress };
                worksheet['A10'] = { t: 's', v: 'Party GSTIN: ' + (currentInvoice.partyGSTIN || '') };
                
                // Fill products starting from row 12
                var startRow = 12;
                for (var i = 0; i < currentInvoice.products.length; i++) {
                    var p = currentInvoice.products[i];
                    var row = startRow + i;
                    worksheet['A' + row] = { t: 'n', v: p.slNo };
                    worksheet['B' + row] = { t: 's', v: p.desc };
                    worksheet['C' + row] = { t: 's', v: p.hsn };
                    worksheet['D' + row] = { t: 'n', v: p.gst };
                    worksheet['E' + row] = { t: 'n', v: p.qty };
                    worksheet['F' + row] = { t: 'n', v: p.rate };
                    worksheet['G' + row] = { t: 'n', v: p.amount };
                }
                
                // Fill totals
                var totalRow = startRow + currentInvoice.products.length + 2;
                worksheet['A' + totalRow] = { t: 's', v: 'CGST: ₹' + currentInvoice.cgst.toFixed(2) };
                worksheet['A' + (totalRow + 1)] = { t: 's', v: 'SGST: ₹' + currentInvoice.sgst.toFixed(2) };
                worksheet['A' + (totalRow + 2)] = { t: 's', v: 'Grand Total: ₹' + currentInvoice.grandTotal.toFixed(2) };
                
                // Convert to HTML for preview
                var html = XLSX.utils.sheet_to_html(worksheet);
                showExcelPreview(html);
                
            } catch (error) {
                console.error('Error processing Excel template:', error);
                alert('Could not process Excel template. Showing standard invoice format.');
                showInvoicePreview();
            }
        } else {
            console.log('Excel template not found, using standard format');
            showInvoicePreview();
        }
    };
    
    xhr.onerror = function() {
        console.log('Could not load Excel template, using standard format');
        showInvoicePreview();
    };
    
    xhr.send();
}

function showExcelPreview(htmlContent) {
    var modal = document.getElementById('invoiceModal');
    var preview = document.getElementById('invoicePreview');
    
    // Wrap the Excel HTML in a styled container
    preview.innerHTML = '<div style="width: 210mm; min-height: 297mm; background: white; color: black; padding: 20px; font-family: Arial;">' +
        '<style>' +
        'table { width: 100%; border-collapse: collapse; }' +
        'td, th { border: 1px solid #000; padding: 8px; }' +
        'th { background: #f0f0f0; font-weight: bold; }' +
        '</style>' +
        htmlContent +
        '</div>';
    
    modal.style.display = 'block';
}


function _renderInvoicePreview(modal, preview, settings) {
    var companyName = settings.companyName || '';
    var companyAddress = settings.companyAddress || '';
    var companyGSTIN = settings.companyGSTIN || '';
    var companyMobile = settings.companyMobile || '';
    var bankName = settings.bankName || '';
    var bankBranch = settings.bankBranch || '';
    var accountNumber = settings.accountNumber || '';
    var ifscCode = settings.ifscCode || '';

    var products = currentInvoice.products;
    if (typeof products === 'string') { try { products = JSON.parse(products); } catch(e) { products = []; } }
    if (!Array.isArray(products)) products = [];
    currentInvoice.products = products;
    currentInvoice.subtotal   = parseFloat(currentInvoice.subtotal)   || 0;
    currentInvoice.cgst       = parseFloat(currentInvoice.cgst)       || 0;
    currentInvoice.sgst       = parseFloat(currentInvoice.sgst)       || 0;
    currentInvoice.grandTotal = parseFloat(currentInvoice.grandTotal) || 0;

    var logoSrc = settings.logoData || (typeof LOGO_DATA_URL !== 'undefined' ? LOGO_DATA_URL : '');
    var B = 'border:1px solid #000;';

    var productsHTML = '';
    for (var i = 0; i < 10; i++) {
        var p = currentInvoice.products[i];
        if (p) {
            var pRate = parseFloat(p.rate) || 0;
            var pAmount = parseFloat(p.amount) || 0;
            productsHTML += '<tr>' +
                '<td style="' + B + 'text-align:center;">' + p.slNo + '</td>' +
                '<td style="' + B + 'text-align:left;">' + p.desc + '</td>' +
                '<td style="' + B + 'text-align:center;">' + (p.hsn || '') + '</td>' +
                '<td style="' + B + 'text-align:center;">' + p.gst + '%</td>' +
                '<td style="' + B + 'text-align:center;">' + p.qty + '</td>' +
                '<td style="' + B + 'text-align:right;">' + pRate.toFixed(2) + '</td>' +
                '<td style="' + B + 'text-align:right;">' + pAmount.toFixed(2) + '</td>' +
                '</tr>';
        } else {
            productsHTML += '<tr>' +
                '<td style="' + B + 'height:30px;">&nbsp;</td>' +
                '<td style="' + B + '">&nbsp;</td><td style="' + B + '">&nbsp;</td>' +
                '<td style="' + B + '">&nbsp;</td><td style="' + B + '">&nbsp;</td>' +
                '<td style="' + B + '">&nbsp;</td><td style="' + B + '">&nbsp;</td>' +
                '</tr>';
        }
    }

    var gstBreakdown = {};
    for (var i = 0; i < currentInvoice.products.length; i++) {
        var p = currentInvoice.products[i];
        var rate = p.gst;
        if (!gstBreakdown[rate]) gstBreakdown[rate] = 0;
        gstBreakdown[rate] += parseFloat(p.amount) || 0;
    }
    var cgst5=0,cgst12=0,cgst18=0,sgst5=0,sgst12=0,sgst18=0;
    if (gstBreakdown[5])  { cgst5  = gstBreakdown[5]  * 0.025; sgst5  = cgst5; }
    if (gstBreakdown[12]) { cgst12 = gstBreakdown[12] * 0.06;  sgst12 = cgst12; }
    if (gstBreakdown[18]) { cgst18 = gstBreakdown[18] * 0.09;  sgst18 = cgst18; }
    var totalCGST = cgst5 + cgst12 + cgst18;
    var totalSGST = sgst5 + sgst12 + sgst18;
    var invoiceTotal = currentInvoice.subtotal + totalCGST + totalSGST;
    var amountInWords = numberToWords(invoiceTotal);

    var html =
    '<div id="bill-print" style="width:210mm;background:#fff;color:#000;font-family:Arial,sans-serif;font-size:13px;margin:0 auto;box-sizing:border-box;padding:8mm;">' +
    '<div style="border:2px solid #000;padding:6px;box-sizing:border-box;">' +
    '<style>#bill-print table{border-collapse:collapse;width:100%;}#bill-print td,#bill-print th{padding:3px 5px;vertical-align:middle;}#bill-print .big{font-size:26px;font-weight:bold;letter-spacing:2px;font-family:Georgia,serif;}</style>' +
    '<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:bold;margin-bottom:2px;"><span>GSTIN: ' + companyGSTIN + '</span><span>MOB No: ' + companyMobile + '</span></div>' +
    '<div style="text-align:center;font-weight:bold;font-size:15px;letter-spacing:2px;padding:2px 0;">TAX INVOICE</div>' +
    '<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:2px 0;">' +
    '<img src="' + logoSrc + '" style="width:75px;height:auto;">' +
    '<div style="text-align:center;"><div class="big">' + companyName + '</div><div style="font-size:12px;color:#333;margin-top:2px;">' + companyAddress + '</div></div>' +
    '</div>' +
    '<div style="border-top:2px solid #000;margin:4px 0;"></div>' +
    '<table><tr><td style="width:65%;' + B + 'font-weight:bold;">Name &amp; Address:</td><td style="width:35%;' + B + 'font-size:12px;text-align:right;">Email: ' + (settings.companyEmail || '') + '</td></tr></table>' +
    '<table><tr>' +
    '<td style="width:65%;' + B + 'vertical-align:top;padding:4px;">' + currentInvoice.customerAddress.replace(/\n/g,'<br>') + '</td>' +
    '<td style="width:35%;' + B + 'vertical-align:top;"><table style="width:100%;height:100%;border-collapse:collapse;"><tr><td style="border-bottom:1px solid #000;font-weight:bold;text-align:center;padding:4px;">INVOICE NO:</td></tr><tr><td style="text-align:center;font-weight:bold;font-size:13px;padding:4px;">' + currentInvoice.invoiceNo + '</td></tr></table></td>' +
    '</tr></table>' +
    '<table><tr><td style="width:65%;' + B + '">Party GSTIN: ' + (currentInvoice.partyGSTIN || '') + '</td><td style="width:35%;' + B + '">Date: ' + formatDate(currentInvoice.date) + '</td></tr></table>' +
    '<table><thead><tr style="background:#f0f0f0;">' +
    '<th style="width:6%;' + B + 'text-align:center;">Sl.No</th>' +
    '<th style="width:32%;' + B + 'text-align:center;">Name of Product / Service</th>' +
    '<th style="width:12%;' + B + 'text-align:center;">HSN/SAN</th>' +
    '<th style="width:10%;' + B + 'text-align:center;">GST RATE</th>' +
    '<th style="width:8%;' + B + 'text-align:center;">QTY</th>' +
    '<th style="width:14%;' + B + 'text-align:center;">RATE</th>' +
    '<th style="width:18%;' + B + 'text-align:center;">AMOUNT</th>' +
    '</tr></thead><tbody>' + productsHTML + '</tbody></table>' +
    '<table style="width:100%;border-collapse:collapse;"><tr>' +
    '<td style="width:70%;vertical-align:top;padding:0;border:none;"><table style="width:100%;border-collapse:collapse;">' +
    '<tr style="background:#f0f0f0;font-weight:bold;"><td style="' + B + 'text-align:center;width:14%;">GST%</td><td style="' + B + 'text-align:center;width:22%;">CGST%</td><td style="' + B + 'text-align:right;width:14%;">Amount</td><td style="' + B + 'text-align:center;width:22%;">SGST%</td><td style="' + B + 'text-align:right;width:14%;">Amount</td></tr>' +
    '<tr><td style="' + B + 'text-align:center;">5%</td><td style="' + B + 'text-align:center;">2.5%</td><td style="' + B + 'text-align:right;">' + cgst5.toFixed(2) + '</td><td style="' + B + 'text-align:center;">2.5%</td><td style="' + B + 'text-align:right;">' + sgst5.toFixed(2) + '</td></tr>' +
    '<tr><td style="' + B + 'text-align:center;">12%</td><td style="' + B + 'text-align:center;">6%</td><td style="' + B + 'text-align:right;">' + cgst12.toFixed(2) + '</td><td style="' + B + 'text-align:center;">6%</td><td style="' + B + 'text-align:right;">' + sgst12.toFixed(2) + '</td></tr>' +
    '<tr><td style="' + B + 'text-align:center;">18%</td><td style="' + B + 'text-align:center;">9%</td><td style="' + B + 'text-align:right;">' + cgst18.toFixed(2) + '</td><td style="' + B + 'text-align:center;">9%</td><td style="' + B + 'text-align:right;">' + cgst18.toFixed(2) + '</td></tr>' +
    '<tr style="font-weight:bold;"><td style="' + B + 'text-align:center;">TOTAL</td><td style="' + B + '"></td><td style="' + B + 'text-align:right;">' + totalCGST.toFixed(2) + '</td><td style="' + B + '"></td><td style="' + B + 'text-align:right;">' + totalSGST.toFixed(2) + '</td></tr>' +
    '</table></td>' +
    '<td style="width:30%;vertical-align:top;padding:0;border:none;"><table style="width:100%;border-collapse:collapse;">' +
    '<tr style="font-weight:bold;"><td style="' + B + 'padding:3px 6px;">TOTAL</td><td style="' + B + 'text-align:right;padding:3px 6px;">' + currentInvoice.subtotal.toFixed(2) + '</td></tr>' +
    '<tr><td style="' + B + 'padding:3px 6px;">CGST</td><td style="' + B + 'text-align:right;padding:3px 6px;">' + totalCGST.toFixed(2) + '</td></tr>' +
    '<tr><td style="' + B + 'padding:3px 6px;">SGST</td><td style="' + B + 'text-align:right;padding:3px 6px;">' + totalSGST.toFixed(2) + '</td></tr>' +
    '<tr><td style="' + B + 'padding:3px 6px;">Round off()</td><td style="' + B + 'text-align:right;padding:3px 6px;">0.00</td></tr>' +
    '<tr style="font-weight:bold;"><td style="' + B + 'padding:3px 6px;">Invoice Amount</td><td style="' + B + 'text-align:right;padding:3px 6px;">\u20B9' + invoiceTotal.toFixed(2) + '</td></tr>' +
    '</table></td></tr></table>' +
    '<table><tr><td style="' + B + 'font-size:12px;"><strong>Bank:</strong> ' + companyName + ' &nbsp;|&nbsp; ' + bankName + ', ' + bankBranch + '</td></tr>' +
    '<tr><td style="' + B + 'font-size:12px;"><strong>A/c No:</strong> ' + accountNumber + ' &nbsp;|&nbsp; <strong>IFSC:</strong> ' + ifscCode + '</td></tr></table>' +
    '<table><tr><td style="' + B + 'font-size:12px;"><strong>Rupees in Words:</strong> ' + amountInWords + '</td></tr></table>' +
    '<table><tr>' +
    '<td style="width:65%;' + B + 'font-size:12px;vertical-align:top;">1. Subject to Shimoga Jurisdiction.<br>2. We are not responsible for breaking or loss in transport.<br>3. Goods once sold cannot be taken back or exchanged.</td>' +
    '<td style="width:35%;' + B + 'text-align:center;vertical-align:bottom;padding:8px 4px 6px 4px;"><div style="margin-bottom:28px;font-weight:bold;">For ' + companyName + '</div><div style="font-size:12px;">(Authorized Signatory)</div></td>' +
    '</tr></table>' +
    '</div></div>';

    preview.innerHTML = html;
    modal.style.display = 'block';
}


function closeModal() {
    document.getElementById('invoiceModal').style.display = 'none';
    isEditMode = false;
}

function enableEdit() {
    var billPrint = document.getElementById('bill-print');
    var editBtn = document.getElementById('editBtn');
    if (!billPrint) return;

    if (isEditMode) {
        // Save mode - turn off editing
        isEditMode = false;
        billPrint.querySelectorAll('[contenteditable]').forEach(function(el) {
            el.removeAttribute('contenteditable');
            el.style.outline = '';
            el.style.background = '';
        });
        editBtn.textContent = 'Edit';
        editBtn.classList.remove('btn-primary');
        editBtn.classList.add('btn-secondary');
    } else {
        // Edit mode - make all text cells editable
        isEditMode = true;
        billPrint.querySelectorAll('td, div').forEach(function(el) {
            if (el.children.length === 0 || (el.tagName === 'TD' && el.querySelectorAll('table').length === 0)) {
                el.setAttribute('contenteditable', 'true');
                el.style.outline = '2px solid #3949ab';
                el.style.background = '#f0f4ff';
            }
        });
        editBtn.textContent = 'Save';
        editBtn.classList.remove('btn-secondary');
        editBtn.classList.add('btn-primary');
    }
}

function downloadPDF() {
    var element = document.getElementById('bill-print');
    if (!element) { alert('No invoice to download.'); return; }

    var pdfBtn = document.getElementById('pdfBtn');
    if (pdfBtn) { pdfBtn.textContent = 'Generating...'; pdfBtn.disabled = true; }

    html2canvas(element, {
        scale: 2,
        useCORS: false,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false
    }).then(function(canvas) {
        var imgData = canvas.toDataURL('image/jpeg', 0.98);
        var pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        pdf.save('Invoice_' + (currentInvoice ? currentInvoice.invoiceNo : 'download') + '.pdf');
        if (pdfBtn) { pdfBtn.textContent = 'Download PDF'; pdfBtn.disabled = false; }
    }).catch(function(err) {
        console.error('PDF error:', err);
        if (pdfBtn) { pdfBtn.textContent = 'Download PDF'; pdfBtn.disabled = false; }
        alert('Failed: ' + err.message);
    });
}



function loadAllInvoices() {
    var resultsDiv = document.getElementById('searchResults');
    if (resultsDiv) resultsDiv.innerHTML = '<p style="text-align:center;color:#8b949e;">Loading...</p>';
    invoiceDB.getAllInvoices().then(function(invoices) {
        console.log('Loaded invoices:', invoices.length);
        displaySearchResults(invoices);
    }).catch(function(e) {
        console.error('Error loading invoices:', e);
        if (resultsDiv) resultsDiv.innerHTML = '<p style="text-align:center;color:#f87171;">Error loading invoices: ' + e.message + '</p>';
    });
}

function searchInvoices() {
    var searchTerm = document.getElementById('searchInput').value.trim();
    if (!searchTerm) {
        loadAllInvoices();
        return;
    }
    invoiceDB.searchInvoices(searchTerm).then(function(results) {
        displaySearchResults(results);
    });
}

var _invoiceCache = [];

function displaySearchResults(invoices) {
    _invoiceCache = invoices;
    var resultsDiv = document.getElementById('searchResults');
    if (invoices.length === 0) {
        resultsDiv.innerHTML = '<p style="text-align: center; color: #8b949e;">No invoices found</p>';
        return;
    }
    var html = '';
    for (var i = 0; i < invoices.length; i++) {
        var inv = invoices[i];
        var customerPreview = inv.customerAddress ? inv.customerAddress.split('\n')[0].substring(0, 50) : '';
        html += '<div class="invoice-card" onclick="viewInvoice(' + i + ')">' +
            '<h3>Invoice: ' + inv.invoiceNo + '</h3>' +
            '<p><strong>Customer:</strong> ' + customerPreview + '</p>' +
            '<p><strong>Date:</strong> ' + formatDate(inv.date) + '</p>' +
            '<p><strong>Amount:</strong> \u20B9' + (inv.grandTotal || 0).toFixed(2) + '</p>' +
            '</div>';
    }
    resultsDiv.innerHTML = html;
}

function viewInvoice(index) {
    console.log('viewInvoice called, index:', index, 'cache length:', _invoiceCache.length);
    var inv = _invoiceCache[index];
    if (!inv) {
        console.error('No invoice at index', index);
        alert('Invoice not found. Please try searching again.');
        return;
    }
    currentInvoice = inv;
    console.log('currentInvoice set:', currentInvoice.invoiceNo);
    showInvoicePreview();
}

function showInvoicePreview() {
    if (!currentInvoice) { alert('No invoice selected'); return; }
    var modal = document.getElementById('invoiceModal');
    var preview = document.getElementById('invoicePreview');
    if (!modal || !preview) { alert('Modal elements not found'); return; }
    invoiceDB.loadSettings().then(function(settings) {
        try {
            _renderInvoicePreview(modal, preview, settings || {});
        } catch(e) {
            console.error('Render error:', e);
            alert('Error rendering invoice: ' + e.message);
        }
    }).catch(function(e) {
        console.error('Settings load error:', e);
        try {
            _renderInvoicePreview(modal, preview, {});
        } catch(e2) {
            console.error('Render error (fallback):', e2);
            alert('Error rendering invoice: ' + e2.message);
        }
    });
}

function formatDate(dateString) {
    var date = new Date(dateString);
    var day = String(date.getDate()).padStart(2, '0');
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var year = date.getFullYear();
    return day + '.' + month + '.' + year;
}

function numberToWords(num) {
    var ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    var tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    var teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero Rupees Only';
    
    var crore = Math.floor(num / 10000000);
    var lakh = Math.floor((num % 10000000) / 100000);
    var thousand = Math.floor((num % 100000) / 1000);
    var hundred = Math.floor((num % 1000) / 100);
    var remainder = Math.floor(num % 100);
    
    var words = '';
    
    if (crore > 0) words += convertTwoDigit(crore) + ' Crore ';
    if (lakh > 0) words += convertTwoDigit(lakh) + ' Lakh ';
    if (thousand > 0) words += convertTwoDigit(thousand) + ' Thousand ';
    if (hundred > 0) words += ones[hundred] + ' Hundred ';
    if (remainder > 0) words += convertTwoDigit(remainder);
    
    return words.trim() + ' Rupees Only';
    
    function convertTwoDigit(n) {
        if (n < 10) return ones[n];
        if (n >= 10 && n < 20) return teens[n - 10];
        return tens[Math.floor(n / 10)] + ' ' + ones[n % 10];
    }
}

function handleLogoUpload(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        var dataUrl = e.target.result;
        document.getElementById('logoPreview').src = dataUrl;
        document.getElementById('logoPreview').style.display = 'block';
        document.getElementById('logoFileName').textContent = file.name;
        window._pendingLogoData = dataUrl;
    };
    reader.readAsDataURL(file);
}

function resetForm() {
    document.getElementById('customerAddress').value = '';
    document.getElementById('partyGSTIN').value = '';
    document.getElementById('invoiceDate').valueAsDate = new Date();
    document.getElementById('productTableBody').innerHTML = '';
    productRowCount = 0;
    addProductRow();
    calculateTotals();
    initializeApp();
}

window.onclick = function(event) {
    var modal = document.getElementById('invoiceModal');
    if (event.target === modal) {
        closeModal();
    }
}

function loadAnalytics() {
    invoiceDB.getAllInvoices().then(function(invoices) {
        document.getElementById('totalInvoices').textContent = invoices.length;
        
        var totalRevenue = 0;
        for (var i = 0; i < invoices.length; i++) {
            totalRevenue += invoices[i].grandTotal;
        }
        document.getElementById('totalRevenue').textContent = '₹' + totalRevenue.toFixed(2);
        
        var currentMonth = new Date().getMonth();
        var currentYear = new Date().getFullYear();
        var monthRevenue = 0;
        for (var i = 0; i < invoices.length; i++) {
            var invDate = new Date(invoices[i].date);
            if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
                monthRevenue += invoices[i].grandTotal;
            }
        }
        document.getElementById('monthRevenue').textContent = '₹' + monthRevenue.toFixed(2);
        
        var avgInvoice = invoices.length > 0 ? totalRevenue / invoices.length : 0;
        document.getElementById('avgInvoice').textContent = '₹' + avgInvoice.toFixed(2);
        
        var customerTotals = {};
        for (var i = 0; i < invoices.length; i++) {
            var inv = invoices[i];
            var customerName = inv.customerAddress.split('\n')[0].trim();
            if (!customerTotals[customerName]) customerTotals[customerName] = 0;
            customerTotals[customerName] += inv.grandTotal;
        }
        
        var topCustomersArray = [];
        for (var name in customerTotals) {
            topCustomersArray.push([name, customerTotals[name]]);
        }
        topCustomersArray.sort(function(a, b) { return b[1] - a[1]; });
        topCustomersArray = topCustomersArray.slice(0, 5);
        
        var topCustomersHTML = '';
        for (var i = 0; i < topCustomersArray.length; i++) {
            topCustomersHTML += '<div class="customer-item">' +
                '<span>' + topCustomersArray[i][0] + '</span>' +
                '<span style="color: var(--light-blue); font-weight: bold;">₹' + topCustomersArray[i][1].toFixed(2) + '</span>' +
                '</div>';
        }
        
        document.getElementById('topCustomers').innerHTML = topCustomersHTML || '<p style="text-align: center; color: var(--text-gray);">No data available</p>';
    });
}

function loadSettings() {
    invoiceDB.loadSettings().then(function(settings) {
        document.getElementById('companyName').value = settings.companyName || '';
        document.getElementById('companyAddress').value = settings.companyAddress || '';
        document.getElementById('companyGSTIN').value = settings.companyGSTIN || '';
        document.getElementById('companyMobile').value = settings.companyMobile || '';
        document.getElementById('companyEmail').value = settings.companyEmail || '';
        document.getElementById('bankName').value = settings.bankName || '';
        document.getElementById('bankBranch').value = settings.bankBranch || '';
        document.getElementById('accountNumber').value = settings.accountNumber || '';
        document.getElementById('ifscCode').value = settings.ifscCode || '';
        if (settings.logoData) {
            document.getElementById('logoPreview').src = settings.logoData;
            document.getElementById('logoPreview').style.display = 'block';
            document.getElementById('logoFileName').textContent = 'Saved logo';
            window._pendingLogoData = settings.logoData;
        }
    }).catch(function() {});
}

function saveSettings() {
    var settings = {
        companyName: document.getElementById('companyName').value,
        companyAddress: document.getElementById('companyAddress').value,
        companyGSTIN: document.getElementById('companyGSTIN').value,
        companyMobile: document.getElementById('companyMobile').value,
        companyEmail: document.getElementById('companyEmail').value,
        bankName: document.getElementById('bankName').value,
        bankBranch: document.getElementById('bankBranch').value,
        accountNumber: document.getElementById('accountNumber').value,
        ifscCode: document.getElementById('ifscCode').value,
        logoData: window._pendingLogoData || ''
    };
    invoiceDB.saveSettings(settings).then(function() {
        alert('Settings saved successfully!');
    }).catch(function(e) {
        alert('Error saving settings: ' + e.message);
    });
}

function resetSettings() {
    loadSettings();
}

console.log('App.js loaded successfully! All functions defined.');
