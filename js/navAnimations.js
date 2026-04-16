document.addEventListener('DOMContentLoaded', () => {
    const navLinks = Array.from(document.querySelectorAll('.tab-bar a'));
    const interactiveTargets = Array.from(document.querySelectorAll(
        '.tab-bar a, button, .glass-action-btn, .payment-method-btn, .recipient-type-btn, .quantity-btn, .toggle-view-btn, .add-more-btn, .modal-btn, .floating-return-btn, .floating-filter-btn, .card-bg, .product-card, .review-card, .payment-method-card, .info-card'
    ));

    if (!interactiveTargets.length) {
        return;
    }

    interactiveTargets.forEach((element) => {
        element.addEventListener('pointerdown', () => {
            element.classList.add('interactive-press');
            window.setTimeout(() => element.classList.remove('interactive-press'), 260);
        });
    });

    if (navLinks.length) {
        navLinks.forEach((link, index) => {
            link.addEventListener('pointerdown', () => {
                link.classList.add('nav-pop');
                window.setTimeout(() => link.classList.remove('nav-pop'), 620);
            });
        });

        const hintDelay = 220;
        navLinks.forEach((link, index) => {
            setTimeout(() => {
                link.classList.add('nav-shake');
                window.setTimeout(() => link.classList.remove('nav-shake'), 760);
            }, hintDelay * (index + 1));
        });
    }

    const hintTargets = Array.from(document.querySelectorAll(
        '.floating-return-btn, .floating-filter-btn, .card-bg, .product-card, .review-card, .payment-method-card'
    ));

    hintTargets.forEach((element, index) => {
        setTimeout(() => {
            element.classList.add('interactive-press');
            window.setTimeout(() => element.classList.remove('interactive-press'), 360);
        }, 260 * (index + 1));
    });
});
