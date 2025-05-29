const contactService = require('../services/contactService');

exports.identifyContact = async (req, res) => {
  try {
    const result = await contactService.identify(req.body);
    res.status(200).json({ contact: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};