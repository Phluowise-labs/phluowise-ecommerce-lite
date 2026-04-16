/**
 * Phluowise PDF Receipt Generator & Uploader
 * Generates a professional branded receipt, saves to Appwrite Storage,
 * and triggers an Appwrite Function to email the customer.
 */

function sanitize(str) {
    if (!str || typeof str !== 'string') return str || '';
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Shows a theme picker modal before generating the PDF.
 * Returns a Promise that resolves with 'dark' | 'light', or rejects if cancelled.
 */
window.showPdfThemePicker = function() {
    return new Promise((resolve, reject) => {
        const overlay = document.createElement('div');
        overlay.id = 'pdfThemePickerOverlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 999999;
            display: flex; align-items: flex-end; justify-content: center;
            background: rgba(0,0,0,0.65); backdrop-filter: blur(8px);
            padding: 16px;
        `;

        overlay.innerHTML = `
        <div style="
            background: #131318;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 24px 24px 16px 16px;
            width: 100%; max-width: 480px;
            padding: 28px 24px 32px;
            box-shadow: 0 -20px 60px rgba(0,0,0,0.5);
            animation: slideUp 0.3s ease;
        ">
            <div style="text-align:center; margin-bottom: 24px;">
                <div style="
                    width: 40px; height: 4px; border-radius: 9999px;
                    background: rgba(255,255,255,0.2);
                    margin: 0 auto 20px;
                "></div>
                <div style="
                    width: 56px; height: 56px; border-radius: 16px;
                    background: rgba(59,130,246,0.15);
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 16px;
                ">
                    <svg width="28" height="28" fill="none" stroke="#3B82F6" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                    </svg>
                </div>
                <h2 style="color:#FFFFFF; font-size:20px; font-weight:700; margin:0 0 6px;">Save Receipt PDF</h2>
                <p style="color:#9CA3AF; font-size:14px; margin:0;">Choose your preferred receipt style</p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                <!-- Dark Mode Card -->
                <button id="pickDarkPdf" style="
                    background: #0A0A0B; border: 2px solid #3B82F6;
                    border-radius: 16px; padding: 18px 12px;
                    cursor: pointer; text-align: center;
                    transition: transform 0.2s;
                ">
                    <div style="
                        width: 48px; height: 60px; border-radius: 8px;
                        background: #1E1E2E; margin: 0 auto 10px;
                        border: 1px solid rgba(59,130,246,0.4);
                        display: flex; align-items: center; justify-content: center;
                    ">
                        <div style="width:30px;">
                            <div style="height:3px; background:#3B82F6; border-radius:2px; margin-bottom:3px;"></div>
                            <div style="height:2px; background:#374151; border-radius:2px; margin-bottom:3px;"></div>
                            <div style="height:2px; background:#374151; border-radius:2px;"></div>
                        </div>
                    </div>
                    <p style="color:#FFFFFF; font-size:14px; font-weight:600; margin:0 0 2px;">Dark</p>
                    <p style="color:#6B7280; font-size:11px; margin:0;">Professional Dark</p>
                </button>

                <!-- Light Mode Card -->
                <button id="pickLightPdf" style="
                    background: #FFFFFF; border: 2px solid rgba(203,213,225,0.8);
                    border-radius: 16px; padding: 18px 12px;
                    cursor: pointer; text-align: center;
                    transition: transform 0.2s;
                ">
                    <div style="
                        width: 48px; height: 60px; border-radius: 8px;
                        background: #F8FAFC; margin: 0 auto 10px;
                        border: 1px solid #E2E8F0;
                        display: flex; align-items: center; justify-content: center;
                    ">
                        <div style="width:30px;">
                            <div style="height:3px; background:#3B82F6; border-radius:2px; margin-bottom:3px;"></div>
                            <div style="height:2px; background:#CBD5E1; border-radius:2px; margin-bottom:3px;"></div>
                            <div style="height:2px; background:#CBD5E1; border-radius:2px;"></div>
                        </div>
                    </div>
                    <p style="color:#0F172A; font-size:14px; font-weight:600; margin:0 0 2px;">Light</p>
                    <p style="color:#64748B; font-size:11px; margin:0;">Clean White</p>
                </button>
            </div>

            <button id="cancelPdfPicker" style="
                width:100%; padding: 14px;
                background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
                border-radius: 14px; color: #9CA3AF;
                font-size: 15px; font-weight: 500; cursor: pointer;
            ">Cancel</button>
        </div>
        <style>
            @keyframes slideUp { from { transform: translateY(80px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        </style>
        `;

        document.body.appendChild(overlay);

        const cleanup = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); };

        document.getElementById('pickDarkPdf').onclick = () => { cleanup(); resolve('dark'); };
        document.getElementById('pickLightPdf').onclick = () => { cleanup(); resolve('light'); };
        document.getElementById('cancelPdfPicker').onclick = () => { cleanup(); reject(new Error('Cancelled')); };
        overlay.onclick = (e) => { if (e.target === overlay) { cleanup(); reject(new Error('Cancelled')); } };
    });
};


/**
 * Main function: generates PDF, uploads to Appwrite Storage, triggers email.
 * @param {object} orderData - Full order object from schedule-history/checkout
 * @param {string} customerEmail - Email to send to
 * @param {string} theme - 'dark' | 'light'
 */
window.generateAndUploadReceipt = async function(orderData, customerEmail, theme = 'dark') {
    if (!window.html2pdf) {
        console.warn('html2pdf is not loaded. Cannot generate receipt.');
        return;
    }
    if (!customerEmail) {
        console.warn('No customer email provided. Skipping receipt email.');
        return;
    }
    if (!window.storage || !window.functions || !window.appwriteConfig) {
        console.error('Appwrite config not fully initialized (missing storage/functions).');
        return;
    }

    const isDark = theme !== 'light';

    // ── Colour tokens ───────────────────────────────────────────────
    const T = isDark ? {
        bg:        '#0A0A0B',
        cardBg:    '#111113',
        border:    'rgba(255,255,255,0.08)',
        header:    '#FFFFFF',
        subText:   '#9CA3AF',
        bodyText:  '#D1D5DB',
        accent:    '#3B82F6',
        success:   '#10B981',
        rowSep:    'rgba(255,255,255,0.07)',
        totalBg:   'rgba(0,0,0,0.25)',
        logoBg:    'rgba(59,130,246,0.12)',
        divider:   'rgba(255,255,255,0.12)',
    } : {
        bg:        '#F1F5F9',
        cardBg:    '#FFFFFF',
        border:    '#E2E8F0',
        header:    '#0F172A',
        subText:   '#64748B',
        bodyText:  '#334155',
        accent:    '#2563EB',
        success:   '#059669',
        rowSep:    '#F1F5F9',
        totalBg:   '#EFF6FF',
        logoBg:    'rgba(37,99,235,0.09)',
        divider:   '#E2E8F0',
    };

    // ── Normalise data ───────────────────────────────────────────────
    const itemsList = orderData.orderItems || orderData.products || orderData.items || [];
    const subtotalRaw = parseFloat(orderData.subtotal) || 0;
    const totalRaw    = parseFloat(orderData.total)    || 0;
    const serviceFeeRaw = parseFloat(orderData.serviceFee) || 0;
    const calcSub = subtotalRaw > 0 ? subtotalRaw
                  : itemsList.reduce((s,p) => s + (parseFloat(p.productPrice||p.price||0)) * (p.productQty||p.quantity||1), 0);
    const calcFee = serviceFeeRaw > 0 ? serviceFeeRaw
                  : itemsList.reduce((s) => s + 0.20, 0) || 0.20;
    const displayTotal    = totalRaw > 0 ? totalRaw : calcSub + calcFee;
    const displaySubtotal = subtotalRaw > 0 ? subtotalRaw : calcSub;

    const cd = orderData.customerDetails || {};
    const billedName    = sanitize(orderData.deliveryName || cd.recipient_name || cd.full_name || cd.name || 'Customer');
    const billedPhone   = sanitize(orderData.recipient_phone_number || cd.recipient_phone || cd.phone_number || 'N/A');
    const billedEmail   = sanitize(cd.recipient_email || cd.email || customerEmail || 'N/A');
    const billedAddress = sanitize(orderData.deliveryAddress || cd.address || 'N/A');
    const billedType    = sanitize(cd.recipient_type || '');
    const paymentMethod = sanitize(orderData.paymentMethod || 'Pay on Delivery');
    const transactionId = sanitize(orderData.transactionId || 'Pending');
    const company       = sanitize(orderData.company || 'Phluowise Partner');
    const orderId       = sanitize(orderData.orderId || orderData.$id || 'N/A');
    const deliveryDate  = orderData.deliveryDate ? new Date(orderData.deliveryDate).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '';
    const deliveryTime  = sanitize(orderData.deliveryTime || '');
    const instructions  = sanitize(orderData.orderComment || '');

    const st = orderData.orderStatus || orderData.status || 'pending';
    let statusText = 'Pending', statusColor = '#F59E0B';
    if (st === 'confirmed' || st === 'accepted') { statusText = 'Accepted'; statusColor = T.success; }
    else if (st === 'ongoing' || st === 'completed') { statusText = 'Completed'; statusColor = T.success; }
    else if (st === 'denied' || st === 'rejected') { statusText = '#EF4444'; statusColor = '#EF4444'; }

    // ── Item rows ────────────────────────────────────────────────────
    const itemRows = itemsList.length > 0 ? itemsList.map(p => {
        const qty   = p.productQty || p.quantity || 1;
        const price = parseFloat(p.productPrice || p.price || 0);
        const name  = sanitize(p.productName || p.product_name || p.name || (p.product && (p.product.name||p.product.title)) || 'Product');
        const type  = sanitize(p.productType || p.product_type || p.type || '');
        return `
        <tr>
            <td style="padding:12px 8px; border-bottom:1px solid ${T.rowSep}; color:${T.header}; font-size:14px; font-weight:600;">${qty}×</td>
            <td style="padding:12px 8px; border-bottom:1px solid ${T.rowSep}; color:${T.bodyText}; font-size:14px;">
                ${name}${type ? `<br><span style="color:${T.subText}; font-size:12px;">${type}</span>` : ''}
            </td>
            <td style="padding:12px 8px; border-bottom:1px solid ${T.rowSep}; color:${T.header}; font-size:14px; font-weight:600; text-align:right; white-space:nowrap;">GHS ${(price * qty).toFixed(2)}</td>
        </tr>`;
    }).join('') : `
        <tr>
            <td colspan="3" style="padding:16px; text-align:center; color:${T.subText}; font-size:13px;">No item details available</td>
        </tr>`;


    // ── Helper: info row (label + value) ─────────────────────────────
    const row = (label, value) => !value || value === 'N/A' ? '' : `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:9px 0; border-bottom:1px solid ${T.rowSep};">
            <span style="color:${T.subText}; font-size:13px; flex-shrink:0; margin-right:12px;">${label}</span>
            <span style="color:${T.bodyText}; font-size:13px; font-weight:500; text-align:right;">${value}</span>
        </div>`;

    // ── Section card ─────────────────────────────────────────────────
    const card = (title, body) => `
        <div style="background:${T.cardBg}; border:1px solid ${T.border}; border-radius:16px; padding:18px 20px; margin-bottom:14px;">
            <p style="color:${T.accent}; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin:0 0 12px 0;">${title}</p>
            ${body}
        </div>`;

    // ── Full HTML receipt ─────────────────────────────────────────────
    const receiptHtml = `
    <div style="
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        background: ${T.bg}; color: ${T.header};
        width: 100%; max-width: 600px; margin: 0 auto;
        padding: 28px 20px 40px; box-sizing: border-box;
    ">

        <!-- ── HEADER ── -->
        <div style="text-align:center; margin-bottom:28px; padding-bottom:24px; border-bottom:1px solid ${T.divider};">
            <div style="display:inline-flex; align-items:center; justify-content:center; width:64px; height:64px; border-radius:18px; background:${T.logoBg}; margin-bottom:14px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${T.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
            </div>
            <h1 style="color:${T.accent}; font-size:26px; font-weight:800; margin:0 0 2px; letter-spacing:-0.5px;">PHLUOWISE</h1>
            <p style="color:${T.subText}; font-size:13px; margin:0;">Official Order Receipt</p>
            <p style="color:${T.subText}; font-size:12px; margin:6px 0 0;">${new Date().toLocaleString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
        </div>

        <!-- Status badge -->
        <div style="text-align:center; margin-bottom:22px;">
            <span style="display:inline-block; background:${isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5'}; color:${statusColor}; border:1px solid ${statusColor}30; border-radius:999px; padding:5px 18px; font-size:13px; font-weight:600;">
                ✓ ${statusText}
            </span>
        </div>

        <!-- ── ORDER SUMMARY ── -->
        ${card('Order Summary', `
            ${row('Order ID', `#${orderId}`)}
            ${row('Company', company)}
            ${row('Delivery Date', deliveryDate)}
            ${row('Delivery Time', deliveryTime)}
            ${row('Instructions', instructions)}
        `)}

        <!-- ── ORDER ITEMS ── -->
        <div style="background:${T.cardBg}; border:1px solid ${T.border}; border-radius:16px; overflow:hidden; margin-bottom:14px;">
            <div style="padding:14px 20px 10px;">
                <p style="color:${T.accent}; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin:0 0 10px;">Order Items</p>
            </div>
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:${isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC'};">
                        <th style="padding:10px 8px; text-align:left; color:${T.subText}; font-size:11px; font-weight:600; border-bottom:1px solid ${T.border};">QTY</th>
                        <th style="padding:10px 8px; text-align:left; color:${T.subText}; font-size:11px; font-weight:600; border-bottom:1px solid ${T.border};">ITEM</th>
                        <th style="padding:10px 8px; text-align:right; color:${T.subText}; font-size:11px; font-weight:600; border-bottom:1px solid ${T.border};">AMOUNT</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
            </table>
            <!-- Totals -->
            <div style="padding:14px 20px; background:${T.totalBg}; border-top:1px solid ${T.divider};">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="color:${T.subText}; font-size:13px;">Subtotal</span>
                    <span style="color:${T.bodyText}; font-size:13px; font-weight:500;">GHS ${displaySubtotal.toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:14px; padding-bottom:14px; border-bottom:1px dashed ${T.divider};">
                    <span style="color:${T.subText}; font-size:13px;">Service & Trans Fee</span>
                    <span style="color:${T.bodyText}; font-size:13px; font-weight:500;">GHS ${calcFee.toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:${T.header}; font-size:17px; font-weight:700;">Total Paid</span>
                    <span style="color:${T.accent}; font-size:22px; font-weight:800;">GHS ${displayTotal.toFixed(2)}</span>
                </div>
            </div>
        </div>

        <!-- ── RECIPIENT INFO ── -->
        ${card('Recipient Information', `
            ${row('Name', billedName)}
            ${row('Phone', billedPhone)}
            ${row('Email', billedEmail)}
            ${row('Address', billedAddress)}
            ${row('Type', billedType)}
        `)}

        <!-- ── PAYMENT & STATUS ── -->
        ${card('Payment & Status', `
            ${row('Payment Method', paymentMethod)}
            ${row('Transaction ID', transactionId)}
            <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:9px 0;">
                <span style="color:${T.subText}; font-size:13px;">Status</span>
                <span style="color:${statusColor}; font-size:13px; font-weight:600;">${statusText}</span>
            </div>
        `)}

        <!-- ── FOOTER ── -->
        <div style="text-align:center; margin-top:28px; padding-top:20px; border-top:1px solid ${T.divider};">
            <p style="color:${T.bodyText}; font-size:14px; font-weight:500; margin:0 0 6px;">Thank you for trusting Phluowise! 🎉</p>
            <p style="color:${T.subText}; font-size:11px; margin:0;">This is a system-generated document and is valid without a signature.</p>
        </div>

    </div>`;

    // ── Inject hidden wrapper ─────────────────────────────────────────
    const wrapper = document.createElement('div');
    wrapper.innerHTML = receiptHtml;
    wrapper.style.cssText = 'position:absolute;left:-9999px;top:0;';
    document.body.appendChild(wrapper);

    try {
        console.log('Generating PDF receipt...');
        const element = wrapper.firstElementChild;

        const pdfBlobA4 = await window.html2pdf().from(element).set({
            margin:      10,
            filename:    `Phluowise-Receipt-${orderId}.pdf`,
            image:       { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 800 },
            jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).outputPdf('blob');

        document.body.removeChild(wrapper);

        // ── Background: Upload + Email (non-blocking) ─────────────────
        (async () => {
            try {
                const bucketId = window.appwriteConfig?.BUCKETS?.RECEIPTS;
                if (!bucketId) return;
                const fileId = window.ID.unique();
                const upResp = await window.storage.createFile(
                    bucketId, fileId,
                    new File([pdfBlobA4], `Receipt_${orderId}.pdf`, { type:'application/pdf' })
                );
                const fileUrl = window.storage.getFileView(bucketId, upResp.$id);
                console.log('PDF saved to Appwrite:', upResp.$id);

                const functionId = window.appwriteConfig?.FUNCTIONS?.SEND_RECEIPT_EMAIL;
                if (!functionId) return;
                window.functions.createExecution(
                    functionId,
                    JSON.stringify({ email: customerEmail, orderId, receiptUrl: fileUrl, customerName: billedName }),
                    false
                ).catch(e => console.error('Email function error:', e));

                console.log('Email dispatch triggered.');
            } catch (uploadErr) {
                console.warn('Background upload/email failed (PDF still available locally):', uploadErr.message);
            }
        })();

        return pdfBlobA4; // Always return the blob so the UI can share/download it

    } catch (e) {
        console.error('Failed to generate receipt:', e);
        if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
        throw e;
    }
};
