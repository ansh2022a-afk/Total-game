// इसे चलाने के लिए टर्मिनल में पहले लिखें: npm install express cors
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 🗄️ इन-मेमरी डेटाबेस (यूजर रिकॉर्ड्स, डिपॉजिट और विड्रॉवल हिस्ट्री)
let users = {
    "9999999999": { name: "खिलाड़ी 1", password: "password123", balance: 5000, isBlocked: false }
};
let depositRequests = [];  
let withdrawRequests = []; // विड्रॉवल रिक्वेस्ट स्टोर करने के लिए
let usedUTRs = new Set();  // डुप्लीकेट यूटीआर ब्लॉक करने के लिए
let betHistory = [];       // संदिग्ध बेटिंग (Opposite Betting) जांचने के लिए


// 🌐 [महत्वपूर्ण]: यह कोड क्रोम ब्राउज़र में फ्रंटएंड स्क्रीन (HTML) दिखाएगा
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gold365 Club - Chrome Betting Web</title>
    <style>
        body { font-family: Arial, sans-serif; background: #111; color: white; margin: 0; padding: 10px; text-align: center; }
        input, button, select { width: 90%; padding: 12px; margin: 6px 0; border-radius: 5px; border: none; font-size: 16px; box-sizing: border-box; }
        button { background: #ffcc00; color: black; font-weight: bold; cursor: pointer; }
        .box { background: #222; border: 1px solid #333; padding: 12px; border-radius: 8px; margin-bottom: 12px; text-align: left; }
        .hidden { display: none; }
        .flex-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
        .odd-btn { width: 48%; padding: 10px; font-weight: bold; border-radius: 4px; border: none; font-size: 15px; text-align: center;}
        .back { background: #6cb4e4; color: black; }
        .lay { background: #fca4b4; color: black; }
        .bet-slip { background: #333; border: 2px solid #ffcc00; border-radius: 6px; padding: 12px; margin-top: 10px; }
        .chip-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 8px 0; }
        .chip-btn { background: #444; color: #ffcc00; padding: 8px 0; font-size: 13px; border-radius: 4px; font-weight: bold; width: 100%; }
        .pay-details { background: #1a1a1a; border: 1px dashed #555; padding: 10px; border-radius: 5px; margin: 8px 0; font-size: 14px; }
    </style>
</head>
<body>

    <!-- 🔐 1. ऑथेंटिकेशन गेट -->
    <div id="authSection" class="box" style="text-align: center;">
        <h2>Gold365 Club</h2>
        <input type="number" id="phone" placeholder="मोबाइल नंबर">
        <input type="password" id="password" placeholder="पासवर्ड">
        <button onclick="login()">लॉगिन करें</button>
        <button style="background:#555; color:white;" onclick="register()">नया अकाउंट बनाएं</button>
    </div>

    <!-- 📱 2. मुख्य डैशबोर्ड स्क्रीन -->
    <div id="mainDashboard" class="hidden">
        <div class="box" style="display: flex; justify-content: space-between; align-items: center;">
            <span>नमस्ते, <b id="userName">User</b></span>
            <span style="color:#4CAF50; font-weight: bold;">बैलेंस: ₹<span id="userBalance">0</span></span>
        </div>
        
        <!-- 💰 डिपॉजिट पैनल -->
        <div class="box" style="background:#2d2d2d;">
            <h4 style="margin:0 0 4px 0; color:#4CAF50;">💰 पैसे लोड करें (न्यूनतम ₹300)</h4>
            <select id="payMethodSelect" onchange="togglePaymentDetails()">
                <option value="PhonePe">PhonePe / Google Pay / Paytm</option>
                <option value="BankTransfer">Direct Bank Account Details</option>
            </select>
            <div id="upiDetails" class="pay-details"><b>UPI ID:</b> gold365@upi</div>
            <div id="bankDetails" class="pay-details hidden"><b>SBI A/C:</b> 12345678901 | <b>IFSC:</b> SBIN0001234</div>
            <input type="number" id="depAmount" placeholder="रकम दर्ज करें (Min ₹300)" min="300">
            <input type="text" id="depUtr" placeholder="12 अंकों का UTR / Txn ID डालें">
            <button onclick="submitDeposit()" style="background:#4CAF50; color:white;">डिपॉजिट रिक्वेस्ट भेजें</button>
        </div>

        <!-- 💸 विड्रॉवल पैनल -->
        <div class="box" style="background:#3a2020;">
            <h4 style="margin:0 0 4px 0; color:#fca4b4;">💸 पैसे निकालें (न्यूनतम ₹300)</h4>
            <input type="number" id="witAmount" placeholder="निकालने वाली रकम (Min ₹300)" min="300">
            <input type="text" id="witBank" placeholder="UPI ID या बैंक खाता विवरण दर्ज करें">
            <button onclick="submitWithdrawal()" style="background:#cc0000; color:white;">विड्रॉ रिक्वेस्ट सबमिट करें</button>
        </div>

        <!-- 🏏 लाइव क्रिकेट मैच -->
        <div class="box">
            <div style="font-weight: bold; color: #ffcc00;">India v Afghanistan (LIVE)</div>
            <div class="flex-row">
                <span>India (Match Odds)</span>
                <div style="width: 60%; display: flex; justify-content: space-between;">
                    <button class="odd-btn back" onclick="openBetSlip('MATCH', 'India', 1.19)">Back 1.19</button>
                    <button class="odd-btn lay" onclick="openBetSlip('MATCH', 'India', 1.20)">Lay 1.20</button>
                </div>
            </div>
            <div class="flex-row" style="margin-top: 10px;">
                <span>Afghanistan (Match Odds)</span>
                <div style="width: 60%; display: flex; justify-content: space-between;">
                    <button class="odd-btn back" onclick="openBetSlip('MATCH', 'Afghanistan', 5.30)">Back 5.30</button>
                    <button class="odd-btn lay" onclick="openBetSlip('MATCH', 'Afghanistan', 5.50)">Lay 5.50</button>
                </div>
            </div>
        </div>

        <!-- 📊 फैंसी सेशन्स टेबल -->
        <div class="box" style="background: #1e1e1e;">
            <div style="font-weight: bold; color: #ffcc00; margin-bottom: 8px;">Line & Fancy Sessions</div>
            <div class="flex-row">
                <span>6 Over Runs IND</span>
                <div style="width: 60%; display: flex; justify-content: space-between;">
                    <button class="odd-btn lay" onclick="openBetSlip('FANCY', '6 Over No', 54)">No 54</button>
                    <button class="odd-btn back" onclick="openBetSlip('FANCY', '6 Over Yes', 55)">Yes 55</button>
                </div>
            </div>
        </div>

        <!-- 🛍️ डायनेमिक बेट स्लिप -->
        <div id="betSlipBox" class="box bet-slip hidden">
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
                <span id="slipSelection">चयन</span>
                <span id="slipOdds" style="color:#ffcc00;">Odds</span>
            </div>
            <input type="number" id="betAmountInput" oninput="calculateExposure()" placeholder="पैसे डालें (Min 100)" min="100">
            <div class="chip-grid">
                <button class="chip-btn" onclick="addChip(100)">+100</button>
                <button class="chip-btn" onclick="addChip(500)">+500</button>
                <button class="chip-btn" onclick="addChip(1000)">+1000</button>
                <button class="chip-btn" onclick="addChip(5000)">+5000</button>
            </div>
            <div id="exposureDisplay" style="font-size:14px; font-weight:bold; margin:6px 0;">लाभ: ₹0 | हानि: ₹0</div>
            <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                <button onclick="closeBetSlip()" style="background:#cc0000; color:white; width:45%;">रद्द करें</button>
                <button onclick="confirmPlaceBet()" style="background:#4CAF50; color:white; width:45%;">Place Bet</button>
            </div>
        </div>
    </div>

    <script>
        const API_URL = "http://localhost:5000/api"; 
        let loggedInUser = null;
        let currentBet = {};

        function togglePaymentDetails() {
            const method = document.getElementById('payMethodSelect').value;
            document.getElementById('bankDetails').classList.toggle('hidden', method !== 'BankTransfer');
            document.getElementById('upiDetails').classList.toggle('hidden', method === 'BankTransfer');
        }

        async function register() {
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const res = await fetch(\`\${API_URL}/register\`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ phone, name: "खिलाड़ी", password })
            });
            const data = await res.json();
            alert(data.message || data.error);
        }

        async function login() {
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const res = await fetch(\`\${API_URL}/login\`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ phone, password })
            });
            const data = await res.json();
            if(res.ok) {
                loggedInUser = data.user.phone;
                document.getElementById('authSection').classList.add('hidden');
                document.getElementById('mainDashboard').classList.remove('hidden');
                document.getElementById('userName').innerText = data.user.name;
                document.getElementById('userBalance').innerText = data.user.balance;
            } else { alert(data.error); }
        }

        async function submitDeposit() {
            const amount = parseInt(document.getElementById('depAmount').value);
            const utrNumber = document.getElementById('depUtr').value;
            const paymentMethod = document.getElementById('payMethodSelect').value;
            
            if(!amount || amount < 300) { alert("त्रुटि: न्यूनतम डिपॉजिट राशि ₹300 आवश्यक है!"); return; }

            const res = await fetch(\`\${API_URL}/deposit/submit\`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ phone: loggedInUser, paymentMethod, utrNumber, amount })
            });
            const data = await res.json();
            alert(data.message || data.error);
        }

        async function submitWithdrawal() {
            const amount = parseInt(document.getElementById('witAmount').value);
            const bankDetails = document.getElementById('witBank').value;
            
            if(!amount || amount < 300) { alert("त्रुटि: आप ₹300 से कम राशि नहीं निकाल सकते हैं!"); return; }

            const res = await fetch(\`\${API_URL}/withdraw/submit\`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ phone: loggedInUser, amount, bankDetails })
            });
            const data = await res.json();
            if(res.ok) { document.getElementById('userBalance').innerText = data.balance; }
            alert(data.message || data.error);
        }

        function openBetSlip(marketType, selection, odds) {
            currentBet = { marketType, selection, odds };
            document.getElementById('betSlipBox').classList.remove('hidden');
            document.getElementById('slipSelection').innerText = selection;
            document.getElementById('slipOdds').innerText = "Odds: " + odds;
            document.getElementById('betAmountInput').value = "";
            calculateExposure();
        }

        function addChip(value) {
            let currentVal = parseInt(document.getElementById('betAmountInput').value) || 0;
            document.getElementById('betAmountInput').value = currentVal + value;
            calculateExposure();
        }

        function calculateExposure() {
            let amount = parseInt(document.getElementById('betAmountInput').value) || 0;
            let profit = 0;
            if(currentBet.marketType === 'MATCH') {
                profit = Math.round(amount * (currentBet.odds - 1)); 
            } else {
                profit = amount; 
            }
            document.getElementById('exposureDisplay').innerText = \`लाभ: +₹\${profit} | हानि: -₹\${amount}\`;
        }

        function closeBetSlip() {
            document.getElementById('betSlipBox').classList.add('hidden');
        }

        async function confirmPlaceBet() {
            let amount = parseInt(document.getElementById('betAmountInput').value) || 0;
            if(!amount || amount < 100) return alert("न्यूनतम ₹100 की बेट लगाना अनिवार्य है!");
            
            const res = await fetch(\`\${API_URL}/place-bet\`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    phone: loggedInUser,
                    matchId: "MATCH_IND_AFG",
                    marketType: currentBet.marketType,
                    selection: currentBet.selection,
                    amount: amount,
                    odds: currentBet.odds
                })
            });
            const data = await res.json();
            if(res.ok) {
                alert(data.message);
                document.getElementById('userBalance').innerText = data.balance;
                closeBetSlip();
            } else { alert(data.error); }
        }
    </script>
</body>
</html>
    `);
});

// 🔐 1. यूजर रजिस्ट्रेशन और लॉगिन एपीआई
app.post('/api/register', (req, res) => {
    const { phone, name, password } = req.body;
    if (users[phone]) return res.status(400).json({ error: "यह नंबर पहले से रजिस्टर्ड है!" });
    users[phone] = { name, password, balance: 0, isBlocked: false };
    res.json({ success: true, message: "अकाउंट बन गया! अब लॉगिन करें।" });
});

app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    const user = users[phone];
    if (!user || user.password !== password) return res.status(400).json({ error: "गलत नंबर या पासवर्ड!" });
    if (user.isBlocked) return res.status(403).json({ error: "आपका अकाउंट ब्लॉक है!" });
    res.json({ success: true, message: "लॉगिन सफल!", user: { phone, name: user.name, balance: user.balance } });
});

// 💳 2. सुरक्षित डिपॉजिट पैनल
app.post('/api/deposit/submit', (req, res) => {
    const { phone, paymentMethod, utrNumber, amount } = req.body;
    const amt = parseInt(amount);

    if (!amt || amt < 300) {
        return res.status(400).json({ error: "नियम त्रुटि: न्यूनतम डिपॉजिट राशि ₹300 होना अनिवार्य है!" });
    }
    if (!utrNumber || utrNumber.length < 6) {
        return res.status(400).json({ error: "अवैध UTR या ट्रांजैक्शन आईडी!" });
    }
    if (usedUTRs.has(utrNumber)) {
        return res.status(400).json({ error: "यह UTR पहले इस्तेमाल हो चुका है! फ्रॉड ब्लॉक किया गया।" });
    }

    depositRequests.push({
        requestId: "REQ_DEP_" + Date.now(),
        phone,
        paymentMethod,
        utrNumber,
        amount: amt,
        status: "PENDING",
        timestamp: new Date()
    });
    res.json({ success: true, message: "डिपॉजिट पेंडिंग में है। एडमिन खाता देखकर अप्रूव करेगा।" });
});

// 💸 3. सुरक्षित विड्रॉवल पैनल
app.post('/api/withdraw/submit', (req, res) => {
    const { phone, amount, bankDetails } = req.body;
    const user = users[phone];
    const amt = parseInt(amount);

    if (!user || user.isBlocked) return res.status(403).json({ error: "अकाउंट प्रतिबंधित है!" });
    
    if (!amt || amt < 300) {
        return res.status(400).json({ error: "नियम त्रुटि: आप ₹300 से कम पैसे नहीं निकाल सकते हैं!" });
    }
    if (user.balance < amt) {
        return res.status(400).json({ error: "आपके वॉलेट में पर्याप्त बैलेंस नहीं है!" });
    }

    // 🛡️ एंटी-फ्रॉड ईमानदारी जांच
    const userBets = betHistory.filter(b => b.phone === phone);
    let hasOppositeBet = false;
    let matches = {};
    userBets.forEach(b => {
        if (!matches[b.matchId]) matches[b.matchId] = new Set();
        matches[b.matchId].add(b.selection);
        if (matches[b.matchId].size > 1) hasOppositeBet = true;
    });

    if (hasOppositeBet) {
        return res.status(400).json({ 
            error: "विड्रॉवल ब्लॉक! सिस्टम ने संदिग्ध गेमप्ले (Opposite Betting) पकड़ा है। एडमिन जांच जारी है।" 
        });
    }

    user.balance -= amt;
    withdrawRequests.push({
        withdrawId: "REQ_WIT_" + Date.now(),
        phone,
        amount: amt,
        bankDetails,
        status: "PENDING",
        timestamp: new Date()
    });

    res.json({ success: true, message: "विड्रॉवल रिक्वेस्ट दर्ज हो गई है। 24 घंटे के अंदर पैसे भेज दिए जाएंगे।", balance: user.balance });
});

// 👑 4. एडमिन अप्रूवल पैनल
app.post('/api/admin/approve-deposit', (req, res) => {
    const { requestId, action } = req.body;
    const reqData = depositRequests.find(r => r.requestId === requestId);
    if (!reqData || reqData.status !== "PENDING") return res.status(400).json({ error: "अवैध रिक्वेस्ट!" });

    if (action === "APPROVE") {
        users[reqData.phone].balance += reqData.amount;
        reqData.status = "APPROVED";
        usedUTRs.add(reqData.utrNumber);
        res.json({ success: true, message: "पैसा वॉलेट में जोड़ दिया गया।" });
    } else {
        reqData.status = "REJECTED";
        res.json({ success: true, message: "फेक रिक्वेस्ट रिजेक्ट की गई।" });
    }
});

// 🏏 5. मैच और फैंसी सेशन्स
app.post('/api/place-bet', (req, res) => {
    const { phone, matchId, marketType, selection, amount, odds } = req.body;
    const user = users[phone];

    if (!user || user.isBlocked) return res.status(403).json({ error: "अकाउंट ब्लॉक है!" });
    if (amount < 100) return res.status(400).json({ error: "मैच में न्यूनतम ₹100 की बेट लगाना अनिवार्य है!" });
    if (user.balance < amount) return res.status(400).json({ error: "अपर्याप्त बैलेंस!" });

    setTimeout(() => {
        user.balance -= amount;
        betHistory.push({ phone, matchId, marketType, selection, amount, odds, timestamp: Date.now() });
        res.json({ success: true, message: "बेट लग गई!", balance: user.balance });
    }, 3000); 
});

app.listen(5000, () => console.log('सिक्योर ऑल-इन-वन इंजन पोर्ट 5000 पर रनिंग है...'));
