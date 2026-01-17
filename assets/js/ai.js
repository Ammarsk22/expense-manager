// --- FINTRACK AI ENGINE ---
// A simple client-side rule-based AI to predict categories and format text.

const AI = {
    
    // 1. KNOWLEDGE BASE (Keywords mapping)
    knowledgeBase: {
        'food': [
            'zomato', 'swiggy', 'food', 'lunch', 'dinner', 'breakfast', 'snacks', 
            'burger', 'pizza', 'sandwich', 'coffee', 'chai', 'tea', 'starbucks', 
            'mcdonalds', 'kfc', 'dominos', 'restaurant', 'cafe', 'bar', 'drinks',
            'pani puri', 'samosa', 'vada pav', 'biryani'
        ],
        'travel': [
            'uber', 'ola', 'rapido', 'cab', 'taxi', 'auto', 'rickshaw', 
            'bus', 'train', 'metro', 'flight', 'ticket', 'petrol', 'fuel', 
            'diesel', 'cng', 'parking', 'toll', 'fastag', 'mechanic', 'repair',
            'puncture', 'service'
        ],
        'shopping': [
            'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'shopping', 
            'clothes', 'shoes', 'watch', 'mall', 'zara', 'h&m', 'decathlon',
            'store', 'purchase', 'gift', 'electronics'
        ],
        'bills': [
            'bill', 'recharge', 'jio', 'airtel', 'vi', 'vodafone', 'bsnl',
            'wifi', 'broadband', 'electricity', 'light bill', 'bijli', 'gas', 
            'cylinder', 'water', 'maintenance', 'rent', 'house', 'emi'
        ],
        'entertainment': [
            'netflix', 'spotify', 'prime', 'hotstar', 'disney', 'youtube',
            'movie', 'cinema', 'bookmyshow', 'game', 'playstation', 'steam',
            'party', 'club', 'event'
        ],
        'grocery': [
            'grocery', 'milk', 'vegetable', 'fruit', 'kirana', 'blinkit', 
            'zepto', 'bigbasket', 'dmart', 'reliance fresh', 'supermarket',
            'bread', 'egg', 'ration'
        ],
        'health': [
            'medicine', 'pharmacy', 'doctor', 'hospital', 'clinic', 'checkup',
            'gym', 'yoga', 'protein', 'supplement', 'medplus', 'apollo'
        ],
        'salary': [
            'salary', 'income', 'wage', 'stipend', 'bonus', 'earnings', 'profit'
        ]
    },

    // 2. PREDICT CATEGORY
    predictCategory: function(text) {
        if (!text) return null;
        
        const lowerText = text.toLowerCase().trim();
        
        // Check for exact keyword matches
        for (const [category, keywords] of Object.entries(this.knowledgeBase)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                // Capitalize first letter of category for consistency
                return category.charAt(0).toUpperCase() + category.slice(1);
            }
        }
        
        return null; // No match found
    },

    // 3. SMART TRANSLATE & FORMAT
    translate: function(text) {
        if (!text) return "";
        
        let cleaned = text.trim();
        const lower = cleaned.toLowerCase();

        // Common Hinglish/Shortcuts replacements
        const dictionary = {
            'bijli bill': 'Electricity Bill',
            'light bill': 'Electricity Bill',
            'gas bill': 'Gas Cylinder',
            'recharge': 'Mobile Recharge',
            'cab': 'Cab Ride',
            'auto': 'Auto Rickshaw',
            'veggies': 'Vegetables',
            'meds': 'Medicines',
            'doc': 'Doctor Visit',
            'net': 'Internet Bill'
        };

        // Check if full phrase matches dictionary
        if (dictionary[lower]) {
            return dictionary[lower];
        }

        // Auto Capitalize First Letter of Each Word
        return cleaned.replace(/\w\S*/g, function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    },

    // 4. GENERATE SUGGESTIONS (Optional Future Use)
    getSuggestions: function(type) {
        if (type === 'expense') {
            return ['Netflix', 'Uber', 'Zomato', 'Grocery', 'Rent', 'Petrol'];
        } else {
            return ['Salary', 'Freelance', 'Refund', 'Bonus', 'Gift'];
        }
    }
};

// Make AI globally available
window.AI = AI;
console.log("🤖 FinTrack AI Module Loaded");