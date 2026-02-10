// Company Data Management Module
// Handles fetching and processing company data from Appwrite database

class CompanyDataManager {
    constructor() {
        this.companies = [];
        this.branches = [];
        this.workingDays = [];
        this.products = [];
        this.socialMedia = [];
        this.verifications = [];
        this.userSettings = [];
        this.ratings = [];
        this.isLoading = false;
        this.lastFetchTime = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    }

    // Fetch all companies and their branches from database
    async fetchCompanyData() {
        if (this.isLoading) return this.companies;

        // Check cache
        if (this.lastFetchTime && (Date.now() - this.lastFetchTime < this.cacheTimeout)) {
            console.log('📦 Using cached company data');
            return this.companies;
        }

        this.isLoading = true;

        try {
            console.log('🔄 Fetching company data from database...');

            // Fetch companies, branches, working days, products, social media, verification, user settings and ratings in parallel
            const [companiesResponse, branchesResponse, workingDaysResponse, productsResponse, socialMediaResponse, verificationResponse, userSettingsResponse, ratingsResponse] = await Promise.all([
                this.fetchCompanies(),
                this.fetchBranches(),
                this.fetchWorkingDays(),
                this.fetchProducts(),
                this.fetchSocialMedia(),
                this.fetchVerifications(),
                this.fetchUserSettings(),
                this.fetchRatings()
            ]);

            this.companies = companiesResponse;
            this.branches = branchesResponse;
            this.workingDays = workingDaysResponse;
            this.products = productsResponse;
            this.socialMedia = socialMediaResponse;
            this.verifications = verificationResponse;
            this.userSettings = userSettingsResponse;
            this.ratings = ratingsResponse;
            this.lastFetchTime = Date.now();

            // Process and merge data
            const mergedData = this.mergeCompanyAndBranchData();

            console.log(`✅ Successfully loaded ${mergedData.length} companies with branches, working days, products, social media, and ratings`);
            return mergedData;

        } catch (error) {
            console.error('❌ Error fetching company data:', error);
            // Return fallback data if database fails
            return this.getFallbackData();
        } finally {
            this.isLoading = false;
        }
    }

    // Fetch companies from company_tb table
    async fetchCompanies() {
        try {
            // Check if Appwrite is available
            if (!window.databases || !window.appwriteConfig) {
                console.error('❌ Appwrite not available - checking if SDK loaded');
                console.log('window.databases:', window.databases);
                console.log('window.appwriteConfig:', window.appwriteConfig);
                console.log('window.Appwrite:', window.Appwrite);
                return [];
            }

            const response = await window.databases.listDocuments(
                window.appwriteConfig.DATABASE_ID,
                'company_tb',
                [
                    window.Query.orderDesc('$createdAt')
                ]
            );

            console.log(`📋 Found ${response.documents.length} companies`);
            return response.documents;
        } catch (error) {
            console.error('❌ Error fetching companies:', error);
            return [];
        }
    }

    // Fetch branches from branches table
    async fetchBranches() {
        try {
            // Check if Appwrite is available
            if (!window.databases || !window.appwriteConfig) {
                console.error('❌ Appwrite not available for branches - checking if SDK loaded');
                console.log('window.databases:', window.databases);
                console.log('window.appwriteConfig:', window.appwriteConfig);
                console.log('window.Appwrite:', window.Appwrite);
                return [];
            }

            const response = await window.databases.listDocuments(
                window.appwriteConfig.DATABASE_ID,
                'branches',
                [
                    window.Query.equal('is_active', true),
                    window.Query.equal('disabled', false),
                    window.Query.orderDesc('$createdAt')
                ]
            );

            console.log('📍 Found', response.documents.length, 'active branches');
            return response.documents;
        } catch (error) {
            console.error('❌ Error fetching branches:', error);
            return [];
        }
    }

    // Fetch working days from working_days table
    async fetchWorkingDays() {
        try {
            const response = await window.databases.listDocuments(
                window.appwriteConfig.DATABASE_ID,
                window.appwriteConfig.WORKING_DAYS_TABLE
            );
            return response.documents;
        } catch (error) {
            console.error('❌ Error fetching working days:', error);
            return [];
        }
    }

    // Fetch products from database
    async fetchProducts() {
        try {
            const response = await window.databases.listDocuments(
                window.appwriteConfig.DATABASE_ID,
                window.appwriteConfig.PRODUCTS_TABLE
            );
            console.log('📦 Raw product data from database:');
            response.documents.forEach((doc, index) => {
                const productName = doc.name || doc.product_name || doc.productName || 'Unknown Product';
                console.log(`📦 Product #${index + 1}: ${productName} - Image: ${doc.product_image || doc.image || 'None'}`);
            });
            return response.documents;
        } catch (error) {
            console.error('❌ Error fetching products:', error);
            return [];
        }
    }

    // Determine verification tier for a company based on user settings
    getVerificationTier(companyId, branchId = null) {
        console.log(`🔍 [DEBUG] Getting verification tier for company: ${companyId}, branch: ${branchId}`);
        console.log(`🔍 [DEBUG] Available user settings:`, this.userSettings);

        // Find user settings for this company/branch
        const userSetting = this.userSettings.find(setting => {
            // user_settings table uses branch_id and user_id fields
            const settingBranchId = setting.branch_id || setting.branchId || setting.branchID || setting.branch;
            const settingUserId = setting.user_id || setting.userId || setting.userID || setting.user;

            // Only match by branch_id for verification tier determination
            const matchesBranch = settingBranchId === branchId;
            // Note: We don't match by user_id for verification tiers to avoid conflicts

            console.log(`🔍 [DEBUG] Checking setting:`, {
                settingBranchId,
                settingUserId,
                targetBranchId: branchId,
                targetCompanyId: companyId,
                matchesBranch,
                allFields: Object.keys(setting)
            });
            return matchesBranch;
        });

        console.log(`🔍 [DEBUG] Found user setting:`, userSetting);

        if (!userSetting) {
            // No user settings found - default to tier2
            console.log(`🔍 [DEBUG] No user settings found for company ${companyId} - defaulting to tier2`);
            return 2;
        }

        const verificationLevel = userSetting.verification_level;
        console.log(`🔍 [DEBUG] Verification level for company ${companyId}: ${verificationLevel}`);
        console.log(`🔍 [DEBUG] Full user setting object:`, userSetting);

        // Map verification_level to tier
        switch (verificationLevel) {
            case 'tier1':
                console.log(`🔍 [DEBUG] Mapped 'tier1' to tier 1`);
                return 1;
            case 'tier2':
                console.log(`🔍 [DEBUG] Mapped 'tier2' to tier 2`);
                return 2;
            case 'tier3':
                console.log(`🔍 [DEBUG] Mapped 'tier3' to tier 3`);
                return 3;
            default:
                console.log(`⚠️ [DEBUG] Unknown verification level '${verificationLevel}' for company ${companyId} - defaulting to tier2`);
                return 2;
        }
    }

    // Merge company and branch data
    mergeCompanyAndBranchData() {
        const mergedData = [];

        this.branches.forEach(branch => {
            // Find the corresponding company
            const company = this.companies.find(c => c.company_id === branch.company_id);

            if (company) {
                // Get working days for this branch
                const branchWorkingDays = this.workingDays.filter(wd =>
                    wd.branch_id === branch.branch_id || wd.company_id === branch.company_id
                );

                // Get products for this branch/company
                const branchProducts = this.products.filter(product =>
                    product.branch_id === branch.branch_id || product.company_id === branch.company_id
                );

                // Get social media for this branch/company
                const branchSocialMedia = this.socialMedia.filter(sm =>
                    sm.branch_id === branch.branch_id || sm.company_id === branch.company_id
                );
                
                // Log social media matching for this branch
                if (branchSocialMedia.length > 0) {
                    console.log(`📱 Found ${branchSocialMedia.length} social media record(s) for branch ${branch.branch_id} (${branch.branch_name})`, branchSocialMedia);
                } else {
                    console.log(`⚠️ No social media records found for branch ${branch.branch_id} (${branch.branch_name})`);
                }

                // Get verification status for this company
                const verification = this.verifications.find(v => {
                    // Verification table uses userId field
                    const verificationUserId = v.userId || v.user_id || v.company_id || v.companyId || v.companyID || v.company;
                    return verificationUserId === branch.company_id;
                });
                const verificationStatus = verification ?
                    (verification.status || verification.verification_status || verification.verificationStatus) :
                    null;
                const isVerified = verificationStatus === 'verified';

                // Get verification tier for this company/branch
                const verificationTier = this.getVerificationTier(branch.company_id, branch.branch_id);

                // Get company rating for this branch
                const companyRating = this.getCompanyRating(branch.company_id, branch.branch_id);

                console.log(`🔍 Checking verification for company ${branch.company_id}:`);
                console.log('- Found verification:', verification);
                console.log('- Verification status:', verificationStatus || 'N/A');
                console.log('- isVerified:', isVerified);
                console.log('- Verification tier:', verificationTier);
                console.log('- Company rating:', companyRating);
                console.log('- Branch name:', branch.branch_name);

                // Debug: Show all verification records for troubleshooting
                if (this.verifications.length > 0) {
                    console.log('🔍 All verification records:');
                    this.verifications.forEach((v, i) => {
                        const verificationUserId = v.userId || v.user_id || v.company_id || v.companyId || v.companyID || v.company;
                        const status = v.status || v.verification_status || v.verificationStatus;
                        console.log(`  ${i + 1}. userId: ${verificationUserId}, status: ${status}, $id: ${v.$id}, allFields: ${Object.keys(v)}`);
                    });
                }

                // Create merged company object with branch info
                const mergedCompany = {
                    id: branch.$id, // Use branch document ID as main ID
                    branch_id: branch.branch_id,
                    company_id: branch.company_id,
                    name: company.name,
                    branch_name: branch.branch_name || company.name,
                    email: branch.email,
                    phone_number: branch.phone_number,
                    location: branch.location || 'Location not specified',
                    description: branch.description,
                    website: branch.website,
                    is_online: branch.is_online || false,
                    is_active: branch.is_active || false,
                    profile_image: branch.profile_image,
                    header_image: branch.header_image,
                    branch_type: branch.branch_type,
                    is_verified: isVerified, // Add verification status
                    verification_tier: verificationTier, // Add verification tier
                    company_rating: companyRating.average, // Add company average rating
                    rating_count: companyRating.count, // Add rating count
                    coordinates: this.generateCoordinates(branch.location),
                    working_days: branchWorkingDays, // Add working days
                    products: branchProducts.map(product => ({
                        ...product,
                        name: product.name || product.product_name || product.productName || 'Unknown Product',
                        price: product.price || product.product_price || product.productPrice || 0,
                        type: product.type || product.product_type || product.productType || 'product',
                        minQuantity: product.minQuantity || product.min_quantity || 1,
                        rating: this.getProductRating(product),
                        image: this.getProductImageUrl(product.product_image || product.image)
                    })),
                    social_media: branchSocialMedia, // Add social media links
                    // Additional fields for compatibility
                    time: this.generateTimeText(branch.location),
                    distance: null
                };

                mergedData.push(mergedCompany);
            }
        });

        return mergedData;
    }

    // Enhanced coordinate generation with real Ghana locations
    generateCoordinates(location) {
        // Comprehensive Ghana location database
        const locationCoords = {
            // Major cities and towns
            'Accra, Ghana': { lat: 5.6037, lng: -0.1870 },
            'Tema, Ghana': { lat: 5.6699, lng: -0.0166 },
            'Kumasi, Ghana': { lat: 6.6885, lng: -1.6244 },
            'Takoradi, Ghana': { lat: 4.8845, lng: -1.7554 },
            'Cape Coast, Ghana': { lat: 5.1036, lng: -1.2466 },
            'Ho, Ghana': { lat: 6.6000, lng: 0.4700 },
            'Tamale, Ghana': { lat: 9.3991, lng: -0.8393 },
            'Sunyani, Ghana': { lat: 7.3404, lng: -2.3355 },
            'Koforidua, Ghana': { lat: 6.0833, lng: -0.2567 },
            'Wa, Ghana': { lat: 10.0625, lng: -2.5093 },
            'Bolgatanga, Ghana': { lat: 10.7855, lng: -0.8476 },

            // Accra neighborhoods and districts
            'Osu, Accra': { lat: 5.5600, lng: -0.1850 },
            'Labone, Accra': { lat: 5.5580, lng: -0.1920 },
            'Labadi, Accra': { lat: 5.5430, lng: -0.1700 },
            'Teshie, Accra': { lat: 5.5800, lng: -0.1200 },
            'Nungua, Accra': { lat: 5.6100, lng: -0.0800 },
            'Dawhenya, Accra': { lat: 5.6800, lng: -0.0300 },
            'Ashongman, Accra': { lat: 5.6700, lng: -0.2200 },
            'Madina, Accra': { lat: 5.6500, lng: -0.2300 },
            'Adenta, Accra': { lat: 5.6800, lng: -0.2400 },
            'Aburi, Ghana': { lat: 5.8150, lng: -0.1800 },
            'Kasoa, Ghana': { lat: 5.5200, lng: -0.2800 },
            'Weija, Accra': { lat: 5.5500, lng: -0.3400 },
            'Mallam, Accra': { lat: 5.5300, lng: -0.3500 },
            'Bawaleshie, Accra': { lat: 5.6400, lng: -0.2100 },
            'East Legon, Accra': { lat: 5.6300, lng: -0.1600 },
            'West Legon, Accra': { lat: 5.6200, lng: -0.2000 },
            'Airport, Accra': { lat: 5.6000, lng: -0.1700 },
            'Dzorwulu, Accra': { lat: 5.5900, lng: -0.1900 },
            'Roman Ridge, Accra': { lat: 5.5800, lng: -0.2000 },

            // Kumasi neighborhoods
            'Adum, Kumasi': { lat: 6.6885, lng: -1.6244 },
            'Kejetia, Kumasi': { lat: 6.6900, lng: -1.6200 },
            'Asokwa, Kumasi': { lat: 6.6800, lng: -1.6300 },
            'Kumasi Airport': { lat: 6.7150, lng: -1.5850 },
            'Ahodwo, Kumasi': { lat: 6.7000, lng: -1.6100 },
            'Patasi, Kumasi': { lat: 6.6950, lng: -1.6000 },
            'Santasi, Kumasi': { lat: 6.6750, lng: -1.5900 },

            // Tema neighborhoods
            'Tema Community 1': { lat: 5.6800, lng: -0.0100 },
            'Tema Community 2': { lat: 5.6700, lng: -0.0150 },
            'Tema Community 3': { lat: 5.6650, lng: -0.0200 },
            'Tema Community 4': { lat: 5.6600, lng: -0.0250 },
            'Tema Community 5': { lat: 5.6550, lng: -0.0300 },
            'Tema Community 6': { lat: 5.6500, lng: -0.0350 },
            'Tema Community 7': { lat: 5.6450, lng: -0.0400 },
            'Tema Community 8': { lat: 5.6400, lng: -0.0450 },
            'Tema Community 9': { lat: 5.6350, lng: -0.0500 },
            'Tema Community 10': { lat: 5.6300, lng: -0.0550 },
            'Tema Community 11': { lat: 5.6250, lng: -0.0600 },
            'Tema Community 12': { lat: 5.6200, lng: -0.0650 },
            'Tema Community 13': { lat: 5.6150, lng: -0.0700 },
            'Tema Community 14': { lat: 5.6100, lng: -0.0750 },
            'Tema Community 15': { lat: 5.6050, lng: -0.0800 },
            'Tema Community 16': { lat: 5.6000, lng: -0.0850 },
            'Tema Community 17': { lat: 5.5950, lng: -0.0900 },
            'Tema Community 18': { lat: 5.5900, lng: -0.0950 },
            'Tema Community 19': { lat: 5.5850, lng: -0.1000 },
            'Tema Community 20': { lat: 5.5800, lng: -0.1050 },
            'Tema Community 21': { lat: 5.5750, lng: -0.1100 },
            'Tema Community 22': { lat: 5.5700, lng: -0.1150 },
            'Tema Industrial Area': { lat: 5.6900, lng: -0.0050 },

            // Other major towns
            'Obuasi, Ghana': { lat: 5.9544, lng: -1.8813 },
            'Techiman, Ghana': { lat: 7.5833, lng: -1.9333 },
            'Mankessim, Ghana': { lat: 5.2333, lng: -1.1333 },
            'Swedru, Ghana': { lat: 5.8000, lng: -0.7000 },
            'Nkawkaw, Ghana': { lat: 6.5467, lng: -0.9500 },
            'Konongo, Ghana': { lat: 6.6167, lng: -1.2167 },
            'Prestea, Ghana': { lat: 5.3333, lng: -2.0833 },
            'Elubo, Ghana': { lat: 4.9833, lng: -2.7833 },
            'Sogakope, Ghana': { lat: 6.0000, lng: 0.4500 },
            'Mpraeso, Ghana': { lat: 6.5667, lng: -0.7333 },
            'Berekum, Ghana': { lat: 7.9500, lng: -2.2833 },
            'Dormaa Ahenkro': { lat: 7.5667, lng: -2.8833 },
            'Wassa Akropong': { lat: 5.4500, lng: -2.0500 },
            'Enchi, Ghana': { lat: 5.1333, lng: -2.8833 },
            'Axim, Ghana': { lat: 4.8667, lng: -2.3833 },
            'Shama, Ghana': { lat: 4.9833, lng: -1.6333 },
            'Sefwi Wiawso': { lat: 6.1667, lng: -2.4167 },
            'Bawku, Ghana': { lat: 10.7667, lng: -0.2833 },
            'Yendi, Ghana': { lat: 9.4500, lng: -0.0167 },
            'Salaga, Ghana': { lat: 8.4667, lng: -0.5167 },
            'Damongo, Ghana': { lat: 9.0500, lng: -1.9167 },
            'Buipe, Ghana': { lat: 8.2167, lng: -1.4500 },
            'Kintampo, Ghana': { lat: 8.4500, lng: -1.7167 },
            'Yeji, Ghana': { lat: 8.2333, lng: -0.6333 },
            'Kete Krachi': { lat: 7.8000, lng: -0.0167 },
            'Jasikan, Ghana': { lat: 7.4000, lng: -0.4667 },
            'Kpando, Ghana': { lat: 6.9333, lng: -0.2833 },
            'Hohoe, Ghana': { lat: 7.1500, lng: 0.4667 },
            'Anloga, Ghana': { lat: 5.7333, lng: 0.8833 },
            'Denu, Ghana': { lat: 5.9167, lng: 1.1833 },
            'Aflao, Ghana': { lat: 6.1167, lng: 1.2000 },
            'Ada, Ghana': { lat: 5.8000, lng: 0.6167 },
            'Prampram, Ghana': { lat: 5.7167, lng: 0.1333 },
            'Big Ada, Ghana': { lat: 5.8333, lng: 0.6833 },
            'Amedeka, Ghana': { lat: 5.8667, lng: 0.7000 },
            'Togo, Ghana': { lat: 5.7500, lng: 0.6000 },
            'Akosombo, Ghana': { lat: 6.3000, lng: 0.0500 },
            'Kpong, Ghana': { lat: 6.1500, lng: -0.0500 },
            'Somanya, Ghana': { lat: 6.1000, lng: -0.0333 },
            'Odumase Krobo': { lat: 6.0833, lng: -0.0167 },
            'Amanokrom, Ghana': { lat: 6.2000, lng: -0.7500 },
            'Mampong, Ghana': { lat: 7.4167, lng: -1.3833 },
            'Ejura, Ghana': { lat: 7.3833, lng: -1.3667 },
            'Offinso, Ghana': { lat: 7.5167, lng: -1.7833 },
            'Konongo Odumasi': { lat: 6.6167, lng: -1.2167 },
            'Obuasi Fahiakobo': { lat: 5.9500, lng: -1.8500 },
            'Bibiani, Ghana': { lat: 6.4667, lng: -2.3167 },
            'Sefwi Bekwai': { lat: 6.3667, lng: -2.5333 },
            'Sefwi Asawinso': { lat: 6.2833, lng: -2.6000 },
            'Juaboso, Ghana': { lat: 6.2167, lng: -2.8167 },
            'Bodi, Ghana': { lat: 6.1833, lng: -2.8833 },
            'Wiawso, Ghana': { lat: 6.1667, lng: -2.4167 },
            'Aowin, Ghana': { lat: 5.9167, lng: -2.7500 },
            'Suaman, Ghana': { lat: 5.9833, lng: -2.6833 },
            'Debiso, Ghana': { lat: 5.8500, lng: -2.9500 },
            'Bia, Ghana': { lat: 5.8000, lng: -3.0167 },
            'Jomoro, Ghana': { lat: 4.9500, lng: -2.8333 },
            'Ellembele, Ghana': { lat: 4.8333, lng: -2.6833 },
            'Nzema East, Ghana': { lat: 4.7500, lng: -2.5500 },
            'Ahanta West, Ghana': { lat: 4.9000, lng: -2.1000 },
            'Sekondi, Ghana': { lat: 4.9500, lng: -1.9167 },
            'Takoradi Central': { lat: 4.8845, lng: -1.7554 },
            'Effia-Kwesimintsim': { lat: 4.9000, lng: -1.7833 },
            'Shama District': { lat: 4.9833, lng: -1.6333 },
            'Mpohor Wassa East': { lat: 5.0500, lng: -1.5000 },
            'Wassa East, Ghana': { lat: 5.1167, lng: -1.4500 },
            'Wassa West, Ghana': { lat: 5.1833, lng: -1.4000 },
            'Prestea Huni-Valley': { lat: 5.3333, lng: -2.0833 },
            'Bia East, Ghana': { lat: 5.7500, lng: -2.9167 },
            'Bia West, Ghana': { lat: 5.8500, lng: -3.0167 },
            'Suaman, Ghana': { lat: 5.9833, lng: -2.6833 },
            'Jomoro, Ghana': { lat: 4.9500, lng: -2.8333 },
            'Ellembele, Ghana': { lat: 4.8333, lng: -2.6833 },
            'Nzema East, Ghana': { lat: 4.7500, lng: -2.5500 },
            'Ahanta West, Ghana': { lat: 4.9000, lng: -2.1000 },
            'Mfantsiman, Ghana': { lat: 5.2000, lng: -1.1333 },
            'Ekumfi, Ghana': { lat: 5.2500, lng: -1.0500 },
            'Gomoa West, Ghana': { lat: 5.3000, lng: -0.9500 },
            'Gomoa East, Ghana': { lat: 5.3500, lng: -0.8500 },
            'Awutu Senya West': { lat: 5.4000, lng: -0.7500 },
            'Awutu Senya East': { lat: 5.4500, lng: -0.6500 },
            'Ga East, Ghana': { lat: 5.6500, lng: -0.2500 },
            'Ga West, Ghana': { lat: 5.6000, lng: -0.3500 },
            'Ga South, Ghana': { lat: 5.5500, lng: -0.4500 },
            'Ga Central, Ghana': { lat: 5.5000, lng: -0.5500 },
            'Tema Metropolis': { lat: 5.6699, lng: -0.0166 },
            'Ashaiman, Ghana': { lat: 5.7000, lng: -0.0300 },
            'Adenta, Ghana': { lat: 5.6800, lng: -0.2400 },
            'La Nkwantanang Madina': { lat: 5.6500, lng: -0.2300 },
            'La Dade Kotopon': { lat: 5.5700, lng: -0.1800 },
            'La, Ghana': { lat: 5.5600, lng: -0.1700 },
            'Osu, Ghana': { lat: 5.5600, lng: -0.1850 },
            'Labone, Ghana': { lat: 5.5580, lng: -0.1920 },
            'Krowor, Ghana': { lat: 5.6200, lng: -0.1200 },
            'Ablekuma North': { lat: 5.6300, lng: -0.2800 },
            'Ablekuma South': { lat: 5.6100, lng: -0.3000 },
            'Weija, Ghana': { lat: 5.5500, lng: -0.3400 },
            'Okaikwei North': { lat: 5.5900, lng: -0.2200 },
            'Okaikwei South': { lat: 5.5800, lng: -0.2400 },
            'Ayawaso East': { lat: 5.6200, lng: -0.1600 },
            'Ayawaso West': { lat: 5.6300, lng: -0.1400 },
            'Ayawaso Central': { lat: 5.6100, lng: -0.1800 },
            'Ayawaso North': { lat: 5.6400, lng: -0.2000 }
        };

        // Normalize and validate input
        if (!location || (typeof location !== 'string' && typeof location !== 'number')) {
            console.warn(`⚠️ generateCoordinates called with invalid location: ${location}`);
            return { lat: 5.6037, lng: -0.1870 };
        }

        const locStr = String(location).trim();

        // Try exact match first
        if (locationCoords[locStr]) {
            console.log(`📍 Found exact coordinates for: ${locStr}`);
            return locationCoords[locStr];
        }

        // Try partial match (contains)
        for (const [key, coords] of Object.entries(locationCoords)) {
            if (key.toLowerCase().includes(locStr.toLowerCase()) ||
                locStr.toLowerCase().includes(key.toLowerCase())) {
                console.log(`📍 Found partial match for ${locStr}: ${key}`);
                return coords;
            }
        }

        // Try to extract city name from location string
        const cities = ['Accra', 'Kumasi', 'Tema', 'Takoradi', 'Cape Coast', 'Ho', 'Tamale', 'Sunyani', 'Koforidua', 'Wa', 'Bolgatanga'];
        for (const city of cities) {
            if (locStr.toLowerCase().includes(city.toLowerCase())) {
                const cityKey = `${city}, Ghana`;
                if (locationCoords[cityKey]) {
                    console.log(`📍 Extracted city coordinates for ${locStr}: ${cityKey}`);
                    return locationCoords[cityKey];
                }
            }
        }

        // Fallback: Try to geocode using a simple pattern matching
        console.log(`⚠️ Location not found in database: ${locStr}`);

        // Extract any numeric patterns or common landmarks
        const numericMatch = locStr.match(/\d+/);
        const landmarkMatch = locStr.match(/(market|station|mall|plaza|square|park|church|mosque|school|hospital)/i);

        // Default to Accra Central if no specific location can be determined
        console.log(`📍 Defaulting to Accra Central for: ${locStr}`);
        return {
            lat: 5.6037,
            lng: -0.1870
        };
    }

    // Generate time text based on distance from Accra center
    generateTimeText(location) {
        const coords = this.generateCoordinates(location);
        const accraCenter = { lat: 5.6037, lng: -0.1870 };
        const distance = this.calculateDistance(accraCenter, coords);

        // Generate realistic time based on distance
        const avgSpeed = 30; // km/h average city driving speed
        const timeMinutes = Math.round((distance / avgSpeed) * 60);

        if (timeMinutes < 5) return 'Less than 5 min';
        if (timeMinutes < 15) return `${timeMinutes} min`;
        if (timeMinutes < 60) return `${timeMinutes} min`;

        const hours = Math.floor(timeMinutes / 60);
        const minutes = timeMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }

    // Helper method to calculate distance
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Get fallback data when database fails
    getFallbackData() {
        console.log('🔄 Using fallback company data');
        return []; // Return empty array to show professional empty state instead of fallback data
    }

    // Refresh company data
    async refreshCompanyData() {
        this.lastFetchTime = null; // Invalidate cache
        return await this.fetchCompanyData();
    }

    // Get company by ID
    getCompanyById(companyId) {
        return this.companies.find(c => c.$id === companyId);
    }

    // Get branch by ID
    getBranchById(branchId) {
        return this.branches.find(b => b.$id === branchId);
    }

    // Search companies
    searchCompanies(query) {
        const searchTerm = query.toLowerCase();
        return this.companies.filter(company =>
            company.name.toLowerCase().includes(searchTerm) ||
            company.email.toLowerCase().includes(searchTerm)
        );
    }

    // Get online companies only
    getOnlineCompanies() {
        return this.mergeCompanyAndBranchData().filter(company => company.is_online);
    }

    // Get active companies only
    getActiveCompanies() {
        return this.mergeCompanyAndBranchData().filter(company => company.is_active);
    }

    // Get working days for a specific branch
    getWorkingDaysForBranch(branchId) {
        return this.workingDays.filter(wd =>
            wd.branch_id === branchId || wd.company_id === branchId
        );
    }

    // Get working days for a specific company
    getWorkingDaysForCompany(companyId) {
        return this.workingDays.filter(wd => wd.company_id === companyId);
    }

    // Get products for a specific branch
    getProductsForBranch(branchId) {
        return this.products.filter(product =>
            product.branch_id === branchId || product.company_id === branchId
        );
    }

    // Fetch social media from social_media table
    async fetchSocialMedia() {
        try {
            const response = await window.databases.listDocuments(
                window.appwriteConfig.DATABASE_ID,
                window.appwriteConfig.SOCIAL_MEDIA_TABLE
            );
            console.log(`📱 Found ${response.documents.length} social media links`);
            
            // Log detailed information about each social media record
            response.documents.forEach((doc, index) => {
                console.log(`📱 Social Media Record ${index + 1}:`, {
                    $id: doc.$id,
                    branch_id: doc.branch_id,
                    company_id: doc.company_id,
                    platforms: {
                        facebook: doc.facebook || doc.facebook_url || 'N/A',
                        instagram: doc.instagram || doc.instagram_url || 'N/A',
                        twitter: doc.twitter || doc.twitter_url || 'N/A',
                        linkedin: doc.linkedIn || doc.linkedin_url || 'N/A',
                        discord: doc.discord || doc.discord_url || 'N/A',
                        whatsapp: doc.whatsapp || doc.whatsapp_url || 'N/A'
                    }
                });
            });
            
            return response.documents;
        } catch (error) {
            console.error('❌ Error fetching social media:', error);
            return [];
        }
    }

    // Fetch user settings from user_settings table
    async fetchUserSettings() {
        try {
            const response = await window.databases.listDocuments(
                window.appwriteConfig.DATABASE_ID,
                'user_settings'
            );
            console.log(`⚙️ Found ${response.documents.length} user settings records`);
            return response.documents;
        } catch (error) {
            console.error('❌ Error fetching user settings:', error);
            return [];
        }
    }

    // Fetch verification data from company_verification table
    async fetchVerifications() {
        try {
            const response = await window.databases.listDocuments(
                window.appwriteConfig.DATABASE_ID,
                window.appwriteConfig.COMPANY_VERIFICATION_TABLE
            );
            console.log(`✅ Found ${response.documents.length} verification records:`);
            response.documents.forEach((doc, index) => {
                // Log all available fields to understand the structure
                console.log(`📋 Verification #${index + 1}:`, {
                    $id: doc.$id,
                    allFields: Object.keys(doc),
                    fieldValues: {
                        company_id: doc.company_id,
                        companyId: doc.companyId,
                        companyID: doc.companyID,
                        status: doc.status,
                        verification_status: doc.verification_status,
                        verificationStatus: doc.verificationStatus
                    }
                });
            });
            return response.documents;
        } catch (error) {
            console.error('❌ Error fetching verification data:', error);
            return [];
        }
    }

    // Fetch ratings from ratings table
    async fetchRatings() {
        try {
            const response = await window.databases.listDocuments(
                window.appwriteConfig.DATABASE_ID,
                window.appwriteConfig.RATINGS_TABLE
            );
            console.log(`⭐ Found ${response.documents.length} rating records`);
            return response.documents;
        } catch (error) {
            console.error('❌ Error fetching ratings:', error);
            return [];
        }
    }

    // Get rating for a specific product
    getProductRating(product) {
        if (!product) return 0;

        const productId = product.$id;
        const productName = product.name || product.product_name || '';

        // Debug first product to see structure
        if (this.debugProductCount === undefined) {
            this.debugProductCount = 0;
        }
        if (this.debugProductCount < 3) {
            console.log(`🔍 [DEBUG] Checking rating for product: ${productName} (${productId})`);
            console.log(`   - Product Tags:`, product.tags || product.product_tags);
            this.debugProductCount++;
        }

        const companyId = product.company_id || product.companyId;

        // Get product tags from various possible field names
        let productTags = product.tags || product.product_tags || product.tag || [];
        if (typeof productTags === 'string') {
            try {
                productTags = JSON.parse(productTags);
            } catch (e) {
                productTags = productTags.split(',').map(t => t.trim());
            }
        }

        // Filter ratings to find matches for this product
        const matchingRatings = this.ratings.filter(rating => {
            // 1. Check if rating belongs to same company/branch
            const ratingCompanyId = rating.company_id || rating.companyId;

            if (companyId && ratingCompanyId && companyId !== ratingCompanyId) {
                return false;
            }

            // 2. Try Exact match by product ID (if column existed, but useful to keep)
            let ratingProductId = rating.product_id || rating.productId;
            if (!ratingProductId && rating.product) {
                // Handle expanded relationship
                ratingProductId = typeof rating.product === 'object' ? rating.product.$id : rating.product;
            }

            if (ratingProductId && productId && ratingProductId === productId) {
                console.log(`   ✅ Match found by ID for ${productName}`);
                return true;
            }

            // 3. Match by Tags or Name
            // The ratings table has 'product_tags' as a string column
            let ratingTagsStr = rating.product_tags || rating.tags || rating.tag || '';
            const ratingTagsLower = String(ratingTagsStr).toLowerCase();

            // A. Check if Product Name is in the rating tags (Robust fallback)
            if (productName && ratingTagsLower.includes(productName.toLowerCase())) {
                if (this.debugProductCount <= 3) console.log(`   ✅ Match found by NAME in tags for ${productName}`);
                return true;
            }

            // B. Check standard tag matching
            if (!productTags || productTags.length === 0) return false;

            const hasTagMatch = productTags.some(productTag =>
                ratingTagsLower.includes(String(productTag).toLowerCase().trim())
            );

            if (hasTagMatch) {
                if (this.debugProductCount <= 3) console.log(`   ✅ Match found by TAG for ${productName}`);
            }

            return hasTagMatch;
        });

        if (matchingRatings.length === 0) {
            return 0; // Return 0 if no matching ratings
        }

        // Calculate average rating from all matching ratings
        const totalStars = matchingRatings.reduce((sum, rating) => {
            const stars = parseFloat(rating.stars || rating.rating || rating.star || 0);
            return sum + stars;
        }, 0);

        const averageRating = totalStars / matchingRatings.length;

        // Round to 1 decimal place and ensure it's between 0 and 5
        return Math.round(Math.max(0, Math.min(5, averageRating)) * 10) / 10;
    }

    // Get average rating for a company/branch based on all ratings
    getCompanyRating(companyId, branchId) {
        // Find all ratings for this company/branch
        const companyRatings = this.ratings.filter(rating => {
            const ratingCompanyId = rating.company_id || rating.companyId;
            const ratingBranchId = rating.branch_id || rating.branchId;

            // Match by both company_id and branch_id for more accurate results
            if (branchId) {
                return ratingCompanyId === companyId && ratingBranchId === branchId;
            }
            // If no branch_id provided, match by company_id only
            return ratingCompanyId === companyId;
        });

        if (companyRatings.length === 0) {
            return { average: 0, count: 0 }; // Return 0 if no ratings
        }

        // Calculate average rating from all company ratings
        const totalStars = companyRatings.reduce((sum, rating) => {
            const stars = parseFloat(rating.stars || rating.rating || rating.star || 0);
            return sum + stars;
        }, 0);

        const averageRating = totalStars / companyRatings.length;

        // Round to 1 decimal place and ensure it's between 0 and 5
        return {
            average: Math.round(Math.max(0, Math.min(5, averageRating)) * 10) / 10,
            count: companyRatings.length
        };
    }

    // Get products for a specific company
    getProductsForCompany(companyId) {
        return this.products.filter(product => product.company_id === companyId);
    }

    // Get social media for a specific branch
    getSocialMediaForBranch(branchId) {
        return this.socialMedia.filter(sm =>
            sm.branch_id === branchId || sm.company_id === branchId
        );
    }

    // Get social media for a specific company
    getSocialMediaForCompany(companyId) {
        return this.socialMedia.filter(sm => sm.company_id === companyId);
    }

    // Convert product image path to full Appwrite URL
    getProductImageUrl(imagePath) {
        if (!imagePath) return '';

        // If it's already a full URL, return as-is
        if (imagePath.startsWith('http')) {
            return imagePath;
        }

        // Convert relative path to full Appwrite URL
        const { PROJECT_ID, DATABASE_ID, BUCKETS } = window.appwriteConfig;
        if (BUCKETS && BUCKETS.PRODUCTS) {
            return `https://nyc.cloud.appwrite.io/v1/storage/buckets/${BUCKETS.PRODUCTS}/files/${imagePath}/view?project=${PROJECT_ID}`;
        }

        // Fallback if bucket config not available
        return `https://nyc.cloud.appwrite.io/v1/storage/buckets/68b1c57b001542be7fbe/files/${imagePath}/view?project=${PROJECT_ID}`;
    }
}

// Create global instance
try {
    window.companyDataManager = new CompanyDataManager();
    console.log('✅ CompanyDataManager initialized successfully');
} catch (error) {
    console.error('❌ Failed to initialize CompanyDataManager:', error);
    // Create a fallback instance with basic functionality
    window.companyDataManager = {
        fetchCompanyData: async function () {
            console.log('🔄 Using fallback fetchCompanyData');
            return this.getFallbackData();
        },
        getFallbackData: function () {
            console.log('🔄 Using fallback company data - returning empty array for professional empty state');
            return []; // Return empty array to show professional empty state instead of fallback data
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CompanyDataManager;
}
