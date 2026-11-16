{{supplierName}}
{{supplierAddress}}
{{registrationLine}}

दिनांक: {{today}}

सेवा में,
{{buyerContactPerson}}
लेखा विभाग (Accounts Payable), {{buyerName}}
{{buyerAddress}}

विषय: विनम्र अनुस्मारक — इनवॉइस {{invoiceNumber}} दिनांक {{invoiceDate}} का भुगतान

आदरणीय {{buyerContactPerson}},

हम {{buyerName}} के साथ अपने कारोबारी संबंध को महत्व देते हैं, और नीचे दिए गए भुगतान की विनम्र याद दिलाने के लिए यह पत्र लिख रहे हैं।

- इनवॉइस: {{invoiceNumber}}, दिनांक {{invoiceDate}}
- राशि: {{amount}}
- माल पहुँचाने / सेवा पूरी करने की तारीख: {{deliveryDate}}
{{#objectionResolved}}- आपत्ति सुलझने की तारीख: {{acceptanceDate}}
{{/objectionResolved}}{{#legal}}- {{deadlineSection}} के अनुसार भुगतान की नियत तारीख: {{dueDate}}
{{/legal}}
{{#legal}}
हम MSMED अधिनियम, 2006 के तहत {{category}} उद्यम के रूप में पंजीकृत हैं। {{asOfDate}} तक, भुगतान नियत तारीख से {{daysOverdueText}} पीछे है।

आपकी लेखा टीम की जानकारी के लिए:

1. {{interestSection}} के तहत अब तक {{interest}} ब्याज बन चुका है, जो RBI बैंक रेट के {{interestMultiplier}} गुना की दर से, मासिक चक्रवृद्धि पर है।
{{#taxApplies}}2. {{taxAct}} की {{taxSection}} के तहत, किसी सूक्ष्म या लघु उद्यम को देय जो राशि नियत तारीख बीतने के बाद 31 मार्च को भी बकाया रहती है, उसे उस टैक्स वर्ष में खर्च के रूप में नहीं दिखाया जा सकता।
{{/taxApplies}}{{/legal}}
कृपया जल्द से जल्द भुगतान की व्यवस्था करें, हम आभारी रहेंगे। यदि भुगतान पहले ही हो चुका है, तो कृपया भुगतान का संदर्भ (reference) साझा करें और इस पत्र को अनदेखा करें।

आपके निरंतर सहयोग के लिए धन्यवाद।

सादर,
{{supplierSignatory}}
{{supplierName}}
{{supplierPhone}}{{#supplierEmail}} | {{supplierEmail}}{{/supplierEmail}}
