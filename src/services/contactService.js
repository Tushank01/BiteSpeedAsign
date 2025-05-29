const Contact = require('../models/contact');
const { Op } = require('sequelize');

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

exports.identify = async ({ email, phoneNumber }) => {
  const existingContacts = await Contact.findAll({
    where: {
      [Op.or]: [
        { email: email || null },
        { phoneNumber: phoneNumber || null }
      ]
    }
  });

  if (existingContacts.length === 0) {
    const newContact = await Contact.create({
      email,
      phoneNumber,
      linkPrecedence: 'primary'
    });
    return {
      primaryContactId: newContact.id,
      emails: [email].filter(Boolean),
      phoneNumbers: [phoneNumber].filter(Boolean),
      secondaryContactIds: []
    };
  }

  const allContacts = await Contact.findAll({
    where: {
      [Op.or]: [
        { email: { [Op.in]: existingContacts.map(c => c.email).filter(Boolean) } },
        { phoneNumber: { [Op.in]: existingContacts.map(c => c.phoneNumber).filter(Boolean) } }
      ]
    }
  });

  const primaryContacts = allContacts.filter(c => c.linkPrecedence === 'primary');
  const primaryContact = primaryContacts.sort((a, b) => a.createdAt - b.createdAt)[0];

  for (const contact of allContacts) {
    if (contact.id !== primaryContact.id && contact.linkPrecedence === 'primary') {
      contact.linkPrecedence = 'secondary';
      contact.linkedId = primaryContact.id;
      await contact.save();
    }
  }

  const isNewData =
    !allContacts.some(c => c.email === email && c.phoneNumber === phoneNumber);

  if (isNewData) {
    await Contact.create({
      email,
      phoneNumber,
      linkPrecedence: 'secondary',
      linkedId: primaryContact.id
    });
  }

  const finalContacts = await Contact.findAll({
    where: {
      [Op.or]: [
        { id: primaryContact.id },
        { linkedId: primaryContact.id }
      ]
    }
  });

  return {
    primaryContactId: primaryContact.id,
    emails: unique([primaryContact.email, ...finalContacts.map(c => c.email)]),
    phoneNumbers: unique([primaryContact.phoneNumber, ...finalContacts.map(c => c.phoneNumber)]),
    secondaryContactIds: finalContacts
      .filter(c => c.linkPrecedence === 'secondary')
      .map(c => c.id)
  };
};