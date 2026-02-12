
// Verification script for Terms and Privacy display logic in schedule.html
// This script can be run in the browser console on the schedule.html page to verify the fix.

(function verifyTermsFix() {
    console.log('🧪 Starting Verification: Terms and Privacy Display Logic');

    const originalCompany = window.currentCompany;
    
    try {
        // Test Case 1: Company WITH Terms and Privacy
        console.log('\n--- Test Case 1: Company WITH Terms and Privacy ---');
        window.currentCompany = {
            branch_name: 'Terms Branch',
            tos_url: 'https://example.com/tos',
            privacy_url: 'https://example.com/privacy'
        };
        
        // Trigger UI update (simulate going to terms step)
        if (typeof goToStep === 'function') {
            goToStep('terms');
            const container = document.getElementById('termsLinkContainer');
            const isVisible = container && !container.classList.contains('hidden');
            console.log('✅ Terms container visible:', isVisible);
            
            // Check Modal
            if (typeof openTermsOfService === 'function') {
                openTermsOfService();
                const tosBtn = document.getElementById('branchTermsBtn');
                const privacyBtn = document.getElementById('branchPrivacyBtn');
                console.log('✅ TOS Button visible in modal:', tosBtn && !tosBtn.classList.contains('hidden'));
                console.log('✅ Privacy Button visible in modal:', privacyBtn && !privacyBtn.classList.contains('hidden'));
                closeTermsModal();
            }
        }

        // Test Case 2: Company WITHOUT Terms and Privacy
        console.log('\n--- Test Case 2: Company WITHOUT Terms and Privacy ---');
        window.currentCompany = {
            branch_name: 'No Terms Branch',
            tos_url: '',
            privacy_url: null
        };
        
        if (typeof goToStep === 'function') {
            goToStep('terms');
            const container = document.getElementById('termsLinkContainer');
            const isHidden = container && container.classList.contains('hidden');
            console.log('✅ Terms container hidden:', isHidden);
            
            // Check Modal (even if link is hidden, let's verify logic)
            if (typeof openTermsOfService === 'function') {
                openTermsOfService();
                const tosBtn = document.getElementById('branchTermsBtn');
                const privacyBtn = document.getElementById('branchPrivacyBtn');
                console.log('✅ TOS Button hidden in modal:', tosBtn && tosBtn.classList.contains('hidden'));
                console.log('✅ Privacy Button hidden in modal:', privacyBtn && privacyBtn.classList.contains('hidden'));
                closeTermsModal();
            }
        }

        // Test Case 3: Validation Check for openBranchLink
        console.log('\n--- Test Case 3: Validation Check for openBranchLink ---');
        window.currentCompany = { tos_url: '' };
        console.log('Calling openBranchLink("tos") with empty URL...');
        // Should not crash and should log warning (check console)
        openBranchLink('tos'); 
        console.log('✅ openBranchLink handled empty URL without error');

    } catch (error) {
        console.error('❌ Verification failed with error:', error);
    } finally {
        // Restore original state
        window.currentCompany = originalCompany;
        console.log('\n🧪 Verification Complete');
    }
})();
