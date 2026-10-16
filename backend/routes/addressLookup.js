const express = require('express');
const router = express.Router();
const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1';

function getGoogleApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || null;
}

function isSessionToken(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9-]{16,128}$/.test(value);
}

function getAddressComponent(components, type, field = 'longText') {
  return components.find(component => component.types?.includes(type))?.[field] || '';
}

router.post('/address/google/autocomplete', async (req, res) => {
  try {
    const input = String(req.body?.input || '').trim();
    const sessionToken = req.body?.sessionToken;
    const apiKey = getGoogleApiKey();

    if (input.length < 4 || input.length > 200) {
      return res.status(400).json({ error: 'Address search must be between 4 and 200 characters.' });
    }
    if (!isSessionToken(sessionToken)) {
      return res.status(400).json({ error: 'A valid address-search session token is required.' });
    }
    if (!apiKey) {
      return res.status(503).json({ error: 'Google address autocomplete is not configured. Enter your address manually.' });
    }

    const response = await fetch(`${GOOGLE_PLACES_BASE_URL}/places:autocomplete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input,
        sessionToken,
        includedRegionCodes: ['us'],
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error('Google Places autocomplete failed:', response.status, details);
      return res.status(502).json({ error: 'Google address suggestions are temporarily unavailable. Enter your address manually.' });
    }

    const data = await response.json();
    const suggestions = (data.suggestions || [])
      .map(suggestion => suggestion.placePrediction)
      .filter(prediction => prediction?.placeId && prediction?.text?.text)
      .slice(0, 5)
      .map(prediction => ({
        place_id: prediction.placeId,
        description: prediction.text.text,
      }));

    res.json({ suggestions });
  } catch (error) {
    console.error('Google Places autocomplete error:', error);
    res.status(500).json({ error: 'Google address suggestions failed. Enter your address manually.' });
  }
});

router.post('/address/google/details', async (req, res) => {
  try {
    const placeId = String(req.body?.placeId || '').trim();
    const sessionToken = req.body?.sessionToken;
    const apiKey = getGoogleApiKey();

    if (!placeId || placeId.length > 512) {
      return res.status(400).json({ error: 'A valid Google place ID is required.' });
    }
    if (!isSessionToken(sessionToken)) {
      return res.status(400).json({ error: 'A valid address-search session token is required.' });
    }
    if (!apiKey) {
      return res.status(503).json({ error: 'Google address autocomplete is not configured. Enter your address manually.' });
    }

    const response = await fetch(
      `${GOOGLE_PLACES_BASE_URL}/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'formattedAddress,addressComponents',
        },
      }
    );

    if (!response.ok) {
      const details = await response.text();
      console.error('Google Place Details failed:', response.status, details);
      return res.status(502).json({ error: 'The selected address could not be loaded. Please try again or enter it manually.' });
    }

    const data = await response.json();
    const components = data.addressComponents || [];
    const streetNumber = getAddressComponent(components, 'street_number');
    const route = getAddressComponent(components, 'route');
    const street = [streetNumber, route].filter(Boolean).join(' ');
    const subpremise = getAddressComponent(components, 'subpremise');
    const address = {
      street: street || data.formattedAddress || '',
      street2: subpremise,
      city:
        getAddressComponent(components, 'locality') ||
        getAddressComponent(components, 'postal_town') ||
        getAddressComponent(components, 'sublocality_level_1'),
      state: getAddressComponent(components, 'administrative_area_level_1', 'shortText'),
      zip: getAddressComponent(components, 'postal_code'),
      country: getAddressComponent(components, 'country', 'shortText'),
      formatted_address: data.formattedAddress || '',
    };

    res.json({ address });
  } catch (error) {
    console.error('Google Place Details error:', error);
    res.status(500).json({ error: 'Failed to load the selected address. Please enter it manually.' });
  }
});

module.exports = router;
