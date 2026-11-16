{{supplierName}}
{{supplierAddress}}
{{registrationLine}}

Date: {{today}}

To,
{{buyerContactPerson}}
Accounts Payable, {{buyerName}}
{{buyerAddress}}

Subject: Friendly reminder — payment for invoice {{invoiceNumber}} dated {{invoiceDate}}

Dear {{buyerContactPerson}},

We value our work with {{buyerName}} and are writing as a gentle reminder about the payment below.

- Invoice: {{invoiceNumber}}, dated {{invoiceDate}}
- Amount: {{amount}}
- Goods delivered / services completed on: {{deliveryDate}}
{{#objectionResolved}}- Objection resolved on: {{acceptanceDate}}
{{/objectionResolved}}{{#legal}}- Payment due as per {{deadlineSection}}: {{dueDate}}
{{/legal}}
{{#legal}}
We are registered as a {{category}} enterprise under the MSMED Act, 2006. As of {{asOfDate}}, the payment is {{daysOverdueText}} past the due date.

For your accounts team's reference:

1. Under {{interestSection}}, interest of {{interest}} has accrued so far, at {{interestMultiplier}} times the RBI bank rate, compounded monthly.
{{#taxApplies}}2. Under {{taxSection}} of the {{taxAct}}, an amount payable to a micro or small enterprise that remains unpaid past its due date on 31 March can't be claimed as an expense for that tax year.
{{/taxApplies}}{{/legal}}
We would be grateful if you could arrange the payment at the earliest. If it has already been processed, please share the payment reference and kindly ignore this letter.

Thank you for your continued business.

Warm regards,
{{supplierSignatory}}
{{supplierName}}
{{supplierPhone}}{{#supplierEmail}} | {{supplierEmail}}{{/supplierEmail}}
