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

    // Check for contact names
    for (const contact of allContacts) {
      const contactName = contact.name.toLowerCase();
      
      // Fuzzy matching - check if spoken text contains contact name
      if (lower.includes(contactName) || normalized.includes(contactName.replace(/\s+/g, ''))) {
        console.log(`   ✅ MATCHED: "${contactName}" → ${contact.tel}`);
        
        // Check if there's a number (could be payment)
        const hasNumber = /\d+/.test(lower);
        
        if (!hasNumber) {
          // No number = definitely a call
          console.log("   📞 No number, treating as CALL");
          
          // Create Android deep link to open dialer/contacts with search
          // This approach opens the contacts app and searches for the name
          const androidDialerLink = `intent://contacts/#Intent;scheme=content;action=android.intent.action.VIEW;S.query=${encodeURIComponent(contact.name)};end`;
          
          return NextResponse.json({
            intent: 'call',
            details: {
              recipient: contact.name.charAt(0).toUpperCase() + contact.name.slice(1),
              number: contact.tel,
              androidDialerLink // Add Android intent link for better UX
            },
            originalText: text
          });
        } else {
          // Has number - check for call keywords
          const callKeywords = [
            "call", "kol", "lagao", "phone", "fone", "baat", 
            "कॉल", "लगाओ", "फोन", "बात"
          ];
          const hasCallKeyword = callKeywords.some(kw => lower.includes(kw));
          
          if (hasCallKeyword) {
            console.log("   📞 Has call keyword, treating as CALL");
            
            // Create Android deep link to open dialer/contacts with search
            const androidDialerLink = `intent://contacts/#Intent;scheme=content;action=android.intent.action.VIEW;S.query=${encodeURIComponent(contact.name)};end`;
            
            return NextResponse.json({
              intent: 'call',
              details: {
                recipient: contact.name.charAt(0).toUpperCase() + contact.name.slice(1),
                number: contact.tel,
                androidDialerLink
              },
              originalText: text
            });
          }
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
        .replace(/(pay|send|rupees|rupaye|rs|bhejo|to|ko|de|do|karo)/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      
      if (!name || name.length < 2) name = "merchant";
      
      console.log("✅ RECIPIENT:", name);
      
      // Search for the recipient in contacts to get their UPI ID
      let upiId = "demo@upi"; // Default fallback
      let matchedContact = null;
      
      for (const contact of allContacts) {
        const contactName = contact.name.toLowerCase();
        if (name.includes(contactName) || contactName.includes(name)) {
          matchedContact = contact;
          if (contact.upiId) {
            upiId = contact.upiId;
            console.log(`💳 Found UPI ID for ${contact.name}: ${upiId}`);
          }
          break;
        }
      }
      
      const recipientName = matchedContact 
        ? matchedContact.name.charAt(0).toUpperCase() + matchedContact.name.slice(1)
        : name.charAt(0).toUpperCase() + name.slice(1);
      
      const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(recipientName)}&am=${amount}&cu=INR`;
      
      return NextResponse.json({
        intent: 'pay',
        details: {
          amount,
          recipient: recipientName,
          upiLink,
          upiId // Include UPI ID in response for verification
        },
        warning: matchedContact && !matchedContact.upiId 
          ? `${recipientName} ka UPI ID nahi mila. Demo UPI ID use ho raha hai.`
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
