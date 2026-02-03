import { NextResponse } from 'next/server';

interface Contact {
  name: string;
  tel: string;
  upiId?: string;
}

// Fallback contacts (if device contacts not available)
const FALLBACK_CONTACTS: Record<string, string> = {
  "doctor": "102",
  "daktar": "102",
  "डॉक्टर": "102",
  "police": "100",
  "ambulance": "102"
};

// Scam keywords
const SCAM_WORDS = ["lottery", "winner", "prize", "otp", "kyc", "password", "pin"];

export async function POST(request: Request) {
  try {
    const { text, contacts } = await request.json();
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 RECEIVED:", text);
    console.log("📇 User contacts:", contacts?.length || 0);
    
    const lower = text.toLowerCase().trim();
    const normalized = lower.replace(/\s+/g, '');
    
    console.log("🔍 LOWERCASE:", lower);

    // 1. SCAM CHECK
    for (const word of SCAM_WORDS) {
      if (lower.includes(word)) {
        console.log("⚠️ SCAM DETECTED!");
        return NextResponse.json({
          intent: 'scam',
          details: {},
          warning: `खतरा! Yeh scam lag raha hai. Kabhi bhi ${word} share mat karein.`,
          originalText: text
        });
      }
    }

    // 2. SMART CONTACT MATCHING
    // Combine user contacts with fallback contacts
    const allContacts: Contact[] = [
      ...(contacts || []),
      ...Object.entries(FALLBACK_CONTACTS).map(([name, tel]) => ({ name, tel }))
    ];

    console.log("🔍 Checking in", allContacts.length, "total contacts");

    // Check for contact names - improved matching
    for (const contact of allContacts) {
      const contactName = contact.name.toLowerCase();
      const contactWords = contactName.split(/\s+/);
      
      // Multi-strategy matching for better accuracy
      let matched = false;
      
      // Strategy 1: Exact word match
      for (const word of contactWords) {
        if (word.length >= 3 && lower.includes(word)) {
          matched = true;
          console.log(`   ✅ MATCHED (word): "${word}" in "${contactName}"`);
          break;
        }
      }
      
      // Strategy 2: Full name match
      if (!matched && (lower.includes(contactName) || normalized.includes(contactName.replace(/\s+/g, '')))) {
        matched = true;
        console.log(`   ✅ MATCHED (full): "${contactName}"`);
      }
      
      if (matched) {
        console.log(`   → Contact: ${contact.name}, Tel: ${contact.tel}, UPI: ${contact.upiId || 'none'}`);
        
        // Check if there's a number (could be payment)
        const hasNumber = /\d+/.test(lower);
        
        // Check for call keywords
        const callKeywords = [
          "call", "kol", "karo", "lagao", "phone", "fone", "baat", 
          "कॉल", "लगाओ", "फोन", "बात", "करो"
        ];
        const hasCallKeyword = callKeywords.some(kw => lower.includes(kw));
        
        // Extract amount if present for potential payment
        const amountMatch = lower.match(/(\d+)/);
        const amount = amountMatch ? amountMatch[0] : null;
        
        // Determine intent: CALL if no number OR has call keyword
        if (!hasNumber || hasCallKeyword) {
          console.log("   📞 Treating as CALL");
          
          // Create deep link that opens phone/contacts app and searches for the name
          // This will open the Android phone app with a search for the contact name
          const phoneSearchIntent = `intent:#Intent;action=android.intent.action.SEARCH;component=com.android.contacts/.activities.PeopleActivity;S.query=${encodeURIComponent(contact.name)};end`;
          
          // Alternative: Direct dial link as fallback
          const telLink = `tel:${contact.tel}`;
          
          return NextResponse.json({
            intent: 'call',
            details: {
              recipient: contact.name.charAt(0).toUpperCase() + contact.name.slice(1),
              number: contact.tel,
              deepLink: phoneSearchIntent, // Primary: Opens contacts with search
              telLink: telLink // Fallback: Direct dial
            },
            originalText: text
          });
        }
        
        // If has number but no call keyword, it's likely a payment
        if (amount && !hasCallKeyword) {
          console.log(`   💰 Treating as PAYMENT - Amount: ${amount}`);
          
          const recipientName = contact.name.charAt(0).toUpperCase() + contact.name.slice(1);
          
          // Create deep links for different UPI apps
          // PhonePe deep link with search
          const phonepeLink = `phonepe://pay?pa=${contact.upiId || 'merchant@upi'}&pn=${encodeURIComponent(recipientName)}&am=${amount}&cu=INR`;
          
          // GPay deep link with search
          const gpayLink = `gpay://upi/pay?pa=${contact.upiId || 'merchant@upi'}&pn=${encodeURIComponent(recipientName)}&am=${amount}&cu=INR`;
          
          // Paytm deep link
          const paytmLink = `paytmmp://pay?pa=${contact.upiId || 'merchant@upi'}&pn=${encodeURIComponent(recipientName)}&am=${amount}&cu=INR`;
          
          // Standard UPI link (fallback)
          const upiLink = `upi://pay?pa=${contact.upiId || 'merchant@upi'}&pn=${encodeURIComponent(recipientName)}&am=${amount}&cu=INR`;
          
          return NextResponse.json({
            intent: 'pay',
            details: {
              amount,
              recipient: recipientName,
              upiId: contact.upiId,
              phonepeLink,
              gpayLink,
              paytmLink,
              upiLink // Generic fallback
            },
            warning: !contact.upiId 
              ? `${recipientName} ka UPI ID nahi mila. App khulega, aap select kar sakte hain.`
              : undefined,
            originalText: text
          });
        }
      }
    }

    // 3. PAYMENT INTENT
    const numberMatch = lower.match(/(\d+)/);
    if (numberMatch) {
      const amount = numberMatch[0];
      console.log("💰 PAYMENT INTENT - Amount:", amount);
      
      // Extract recipient name
      let name = lower
        .replace(amount, " ")
        .replace(/(pay|send|rupees|rupaye|rs|bhejo|to|ko|de|do|karo|payment|paisa)/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      
      if (!name || name.length < 2) name = "merchant";
      
      console.log("✅ EXTRACTED NAME:", name);
      
      // Search for the recipient in contacts to get their details
      let upiId = null;
      let matchedContact = null;
      
      // Try to match with loaded contacts
      for (const contact of allContacts) {
        const contactName = contact.name.toLowerCase();
        const contactWords = contactName.split(/\s+/);
        
        // Check if any significant word from contact name is in the extracted name
        let wordMatched = false;
        for (const word of contactWords) {
          if (word.length >= 3 && name.includes(word)) {
            wordMatched = true;
            break;
          }
        }
        
        // Or check if the extracted name contains/matches the contact name
        if (wordMatched || name.includes(contactName) || contactName.includes(name)) {
          matchedContact = contact;
          console.log(`💳 MATCHED CONTACT: ${contact.name}`);
          
          if (contact.upiId) {
            upiId = contact.upiId;
            console.log(`💳 Found UPI ID: ${upiId}`);
          } else {
            console.log(`⚠️ No UPI ID found for ${contact.name}`);
          }
          break;
        }
      }
      
      const recipientName = matchedContact 
        ? matchedContact.name.charAt(0).toUpperCase() + matchedContact.name.slice(1)
        : name.charAt(0).toUpperCase() + name.slice(1);
      
      // UPI Link strategy:
      // If we have a UPI ID from contact, use it
      // Otherwise, use just the name - the UPI app will ask user to select recipient
      const finalUpiId = upiId || recipientName.toLowerCase().replace(/\s+/g, '');
      const upiLink = `upi://pay?pa=${finalUpiId}@upi&pn=${encodeURIComponent(recipientName)}&am=${amount}&cu=INR`;
      
      return NextResponse.json({
        intent: 'pay',
        details: {
          amount,
          recipient: recipientName,
          upiLink,
          upiId: upiId || undefined // Include UPI ID in response for verification
        },
        warning: matchedContact && !upiId
          ? `${recipientName} ka UPI ID nahi mila. Kripya UPI app mein confirm karein.`
          : !matchedContact
          ? `Contact list mein nahi mila. Kripya UPI app mein receiver select karein.`
          : undefined,
        originalText: text
      });
    }

    // 4. UNKNOWN
    console.log("❓ UNKNOWN COMMAND");
    const availableNames = allContacts.slice(0, 5).map(c => c.name).join(", ");
    return NextResponse.json({
      intent: 'unknown',
      details: {},
      warning: contacts?.length > 0 
        ? `Samajh nahi aaya. Aapke contacts mein se kisi ko call karein ya payment bhejein.`
        : `Samajh nahi aaya. Pehle 'Load Contacts' button dabayein ya boliye 'Doctor ko call karo'`,
      originalText: text
    });

  } catch (error) {
    console.error("💥 ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
