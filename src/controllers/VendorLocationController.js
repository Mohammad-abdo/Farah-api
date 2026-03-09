const getPrisma = require('../utils/prisma');

const prisma = getPrisma();

/**
 * Admin-only: list all locations for a vendor
 * GET /api/admin/vendors/:vendorId/locations
 */
async function listLocations(req, res, next) {
  try {
    const { vendorId } = req.params;
    const user = await prisma.user.findFirst({ where: { id: vendorId, role: 'PROVIDER' } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }
    const locations = await prisma.vendorLocation.findMany({
      where: { userId: vendorId },
      orderBy: [{ isMainLocation: 'desc' }, { createdAt: 'asc' }],
    });
    return res.json({ success: true, locations });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: add a branch/location
 * POST /api/admin/vendors/:vendorId/locations
 * Body: locationName, address?, city?, area?, latitude?, longitude?, isMainLocation?
 */
async function createLocation(req, res, next) {
  try {
    const { vendorId } = req.params;
    const { locationName, address, city, area, latitude, longitude, isMainLocation } = req.body;

    if (!locationName || !locationName.trim()) {
      return res.status(400).json({ success: false, error: 'Location name is required' });
    }

    const user = await prisma.user.findFirst({ where: { id: vendorId, role: 'PROVIDER' } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const data = {
      userId: vendorId,
      locationName: locationName.trim(),
      address: address?.trim() || null,
      city: city?.trim() || null,
      area: area?.trim() || null,
      latitude: latitude === '' || latitude === null ? null : parseFloat(latitude),
      longitude: longitude === '' || longitude === null ? null : parseFloat(longitude),
      isMainLocation: !!isMainLocation,
    };

    if (data.isMainLocation) {
      await prisma.vendorLocation.updateMany({
        where: { userId: vendorId },
        data: { isMainLocation: false },
      });
    }

    const location = await prisma.vendorLocation.create({ data });
    return res.status(201).json({ success: true, location });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: update a location
 * PATCH /api/admin/vendors/:vendorId/locations/:locationId
 */
async function updateLocation(req, res, next) {
  try {
    const { vendorId, locationId } = req.params;
    const { locationName, address, city, area, latitude, longitude, isMainLocation } = req.body;

    const existing = await prisma.vendorLocation.findFirst({
      where: { id: locationId, userId: vendorId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Location not found' });
    }

    const updateData = {};
    if (locationName !== undefined) updateData.locationName = locationName.trim();
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (area !== undefined) updateData.area = area?.trim() || null;
    if (latitude !== undefined) updateData.latitude = latitude === '' || latitude === null ? null : parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = longitude === '' || longitude === null ? null : parseFloat(longitude);
    if (isMainLocation !== undefined) {
      updateData.isMainLocation = !!isMainLocation;
      if (updateData.isMainLocation) {
        await prisma.vendorLocation.updateMany({
          where: { userId: vendorId, id: { not: locationId } },
          data: { isMainLocation: false },
        });
      }
    }

    const location = await prisma.vendorLocation.update({
      where: { id: locationId },
      data: updateData,
    });
    return res.json({ success: true, location });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: delete a location
 * DELETE /api/admin/vendors/:vendorId/locations/:locationId
 */
async function deleteLocation(req, res, next) {
  try {
    const { vendorId, locationId } = req.params;

    const existing = await prisma.vendorLocation.findFirst({
      where: { id: locationId, userId: vendorId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Location not found' });
    }

    await prisma.vendorLocation.delete({ where: { id: locationId } });
    return res.json({ success: true, message: 'Location deleted' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
};
