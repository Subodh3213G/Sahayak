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

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 SEARCHING IN CONTACTS");
    console.log("Available contacts:", allContacts.length);
    allContacts.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} (${c.tel}${c.upiId ? ', UPI: ' + c.upiId : ''})`);
    });
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━");

    // Check for contact names - improved matching with extensive debugging
    for (const contact of allContacts) {
      const contactName = contact.name.toLowerCase().trim();
      const contactWords = contactName.split(/\s+/).filter(w => w.length >= 2);
      
      console.log(`\n🔎 Checking contact: "${contact.name}"`);
      console.log(`   Words in contact name: [${contactWords.join(', ')}]`);
      
      // Multi-strategy matching for better accuracy
      let matched = false;
      let matchReason = '';
      
      // Strategy 1: Check if any word from contact name is in the spoken text
      for (const word of contactWords) {
        if (word.length >= 2 && lower.includes(word)) {
          matched = true;
          matchReason = `word "${word}" found in spoken text`;
          console.log(`   ✅ MATCH! Found word "${word}" in "${lower}"`);
          break;
        }
      }
      
      // Strategy 2: Check if spoken text contains the full contact name
      if (!matched && lower.includes(contactName)) {
        matched = true;
        matchReason = `full name "${contactName}" found in spoken text`;
        console.log(`   ✅ MATCH! Full name found in "${lower}"`);
      }
      
      // Strategy 3: Check normalized (no spaces) version
      if (!matched) {
        const normalizedContact = contactName.replace(/\s+/g, '');
        if (normalized.includes(normalizedContact) && normalizedContact.length >= 3) {
          matched = true;
          matchReason = `normalized name "${normalizedContact}" found`;
          console.log(`   ✅ MATCH! Normalized match`);
        }
      }
      
      if (!matched) {
        console.log(`   ❌ No match for "${contact.name}"`);
      }
      
      if (matched) {
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ CONTACT MATCHED!");
        console.log(`   Contact: ${contact.name}`);
        console.log(`   Tel: ${contact.tel}`);
        console.log(`   UPI: ${contact.upiId || 'none'}`);
        console.log(`   Match reason: ${matchReason}`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━");
        
        // Extract amount if present for potential payment
        const amountMatch = lower.match(/(\d+)/);
        const amount = amountMatch ? amountMatch[0] : null;
        
        // Check for call keywords
        const callKeywords = [
          "call", "kol", "karo", "lagao", "phone", "fone", "baat", 
          "कॉल", "लगाओ", "फोन", "बात", "करो", "kare"
        ];
        const hasCallKeyword = callKeywords.some(kw => lower.includes(kw));
        
        console.log(`   Has amount: ${amount || 'no'}`);
        console.log(`   Has call keyword: ${hasCallKeyword}`);
        
        // Determine intent: CALL if no amount OR has call keyword
        if (!amount || hasCallKeyword) {
          console.log("\n📞 DECISION: CALL");
          
          return NextResponse.json({
            intent: 'call',
            details: {
              recipient: contact.name.charAt(0).toUpperCase() + contact.name.slice(1),
              number: contact.tel
            },
            originalText: text
          });
        }
        
        // If has amount and no call keyword, it's a payment
        if (amount && !hasCallKeyword) {
          console.log(`\n💰 DECISION: PAYMENT - Amount: ${amount}`);
          
          const recipientName = contact.name.charAt(0).toUpperCase() + contact.name.slice(1);
          
          // If we have UPI ID, use it; otherwise use phone number as UPI ID
          const upiId = contact.upiId || `${contact.tel}@paytm`;
          
          // Create UPI deep link
          const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(recipientName)}&am=${amount}&cu=INR`;
          
          console.log(`   UPI Link: ${upiLink}`);
          
          return NextResponse.json({
            intent: 'pay',
            details: {
              amount,
              recipient: recipientName,
              upiId: contact.upiId,
              upiLink
            },
            warning: !contact.upiId 
              ? `${recipientName} ka UPI ID nahi mila. Phone number use ho raha hai. UPI app mein correct receiver select karein.`
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
