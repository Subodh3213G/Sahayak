# ✅ Testing Checklist for Sahayak

## Quick Test Guide

### 🔧 Prerequisites
- [ ] Open app on **mobile browser** (Chrome/Edge on Android recommended)
- [ ] Make sure you have **contacts with phone numbers** on your device
- [ ] Ideally, add UPI IDs to some contacts' email fields (optional but recommended)

---

## 📇 Step 1: Load Contacts

1. [ ] Click **"Load Contacts"** button at top
2. [ ] When picker opens, select **ALL** or **many** contacts (not just 1-2)
3. [ ] Check the alert message shows: "✅ Loaded X contacts! Y have UPI IDs"
4. [ ] Open browser console (optional) to see detailed contact list

**Expected Console Output:**
```
📇 ═══════════════════════════
📇 CONTACTS LOADED
📇 Total: 25
📇 With UPI IDs: 3
📇 Sample contacts:
   - raju kumar: 9876543210 [UPI: raju@paytm]
   - doctor: 9998887777 [No UPI]
📇 ═══════════════════════════
```

---

## 📞 Step 2: Test Contact Calling

### Test Case 1: Simple Call
- [ ] Press microphone button
- [ ] Say: **"[Contact Name] ko call karo"** (use a real contact name)
  - Example: "Raju ko call karo"
  - Example: "Doctor ko call karo"

**Expected Result:**
```
✓ Shows: "Call [Name]? [Phone Number]"
✓ Voice says: "I am ready to call [Name]..."
✓ Click "हाँ, भेजें / Yes"
✓ Phone dialer opens with number ready to call
```

### Test Case 2: English Call Command
- [ ] Say: **"Call [Name]"**
  - Example: "Call Raju"
  - Example: "Call Doctor"

**Expected Result:**
```
✓ Same as Test Case 1
```

### Test Case 3: Check Console
- [ ] Open browser console
- [ ] Look for contact matching logs

**Expected Console Output:**
```
✅ MATCHED (word): "raju" in "raju kumar"
→ Contact: Raju Kumar, Tel: 9876543210, UPI: none
📞 Treating as CALL
```

---

## 💳 Step 3: Test UPI Payments

### Test Case 4: Payment to Contact WITH UPI ID
- [ ] Add UPI ID to a contact first (Settings → Contact → Edit → Email → add "name@paytm")
- [ ] Press microphone button  
- [ ] Say: **"[Contact Name] ko 500 rupaye bhejo"**
  - Example: "Raju ko 500 rupaye bhejo"

**Expected Result:**
```
✓ Shows: "₹500 to [Name]"
✓ Shows: "UPI: [name@paytm]" (actual UPI ID)
✓ NO warning message
✓ Click "हाँ, भेजें / Yes"
✓ UPI app opens with correct recipient and amount
```

### Test Case 5: Payment to Contact WITHOUT UPI ID
- [ ] Say: **"[Contact Name] ko 100 rupaye bhejo"** (contact without UPI ID)
  - Example: "Doctor ko 100 rupaye bhejo"

**Expected Result:**
```
✓ Shows: "₹100 to [Name]"
✓ Shows: "UPI: [generic]" or no UPI shown
✓ ⚠️ Warning: "[Name] ka UPI ID nahi mila. Kripya UPI app mein confirm karein."
✓ Voice says warning message
✓ Click "हाँ, भेजें / Yes"
✓ UPI app opens, you need to select correct recipient
```

### Test Case 6: Check Console for Payment
- [ ] Open browser console
- [ ] Look for payment matching logs

**Expected Console Output (WITH UPI ID):**
```
💰 PAYMENT INTENT - Amount: 500
✅ EXTRACTED NAME: raju
💳 MATCHED CONTACT: Raju Kumar
💳 Found UPI ID: raju@paytm
```

**Expected Console Output (WITHOUT UPI ID):**
```
💰 PAYMENT INTENT - Amount: 100
✅ EXTRACTED NAME: doctor
💳 MATCHED CONTACT: Doctor
⚠️ No UPI ID found for Doctor
```

---

## 🐛 Troubleshooting

### ❌ Contact not found?
- [ ] Did you load contacts first?
- [ ] Did you select enough contacts? (not just 1-2)
- [ ] Check console: Look for "📇 CONTACTS LOADED"
- [ ] Try saying the full name clearly

### ❌ Wrong contact matched?
- [ ] Check console to see which contact was matched
- [ ] Multiple contacts with similar names?
- [ ] Try saying a more unique part of the name

### ❌ UPI opens but wrong person?
- [ ] Check if contact has UPI ID in email field
- [ ] If no UPI ID, the app can't know the exact UPI address
- [ ] Solution: Add UPI ID to contact's email field

### ❌ Voice recognition not working?
- [ ] Allow microphone permission
- [ ] Try on Chrome browser (best support)
- [ ] Make sure you're on Android mobile device
- [ ] Check internet connection (voice API needs internet)

---

## 🎯 Success Criteria

### Calling Feature Working:
- [✅] Can call contacts by name
- [✅] "Call Raju" works
- [✅] "[Name] ko call karo" works  
- [✅] Phone dialer opens with correct number
- [✅] Works for multiple different contacts

### Payment Feature Working:
- [✅] Can pay contacts by name
- [✅] "[Name] ko [amount] bhejo" works
- [✅] Shows correct amount
- [✅] Shows UPI ID when available
- [✅] Shows warning when UPI ID not available
- [✅] UPI app opens with correct/close details

---

## 📊 Test Results

After testing, fill this in:

**Contacts Loaded:** ___ contacts  
**Contacts with UPI IDs:** ___

**Call Tests:**
- [ ] Test 1: ✅ / ❌ - Notes: _______________
- [ ] Test 2: ✅ / ❌ - Notes: _______________
- [ ] Test 3: ✅ / ❌ - Notes: _______________

**Payment Tests:**
- [ ] Test 4: ✅ / ❌ - Notes: _______________
- [ ] Test 5: ✅ / ❌ - Notes: _______________
- [ ] Test 6: ✅ / ❌ - Notes: _______________

**Issues Found:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## 💡 Pro Tips

1. **Use Chrome on Android** for best compatibility
2. **Load ALL your contacts** - not just a few
3. **Add UPI IDs** to contacts you pay frequently
4. **Check browser console** when debugging
5. **Speak clearly** in Hindi/Hinglish
6. **First load contacts**, then try commands

---

## 🚀 Ready to Test!

The improved version:
- ✅ Uses universal tel: links (works everywhere)
- ✅ Better contact matching algorithm
- ✅ Extensive logging for debugging
- ✅ Clear warnings when issues occur
- ✅ Works on all devices

**Start testing and report any issues! 🎉**
