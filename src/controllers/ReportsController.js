const getPrisma = require('../utils/prisma');
const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const { ValidationError, NotFoundError } = require('../utils/errors');

const prisma = getPrisma();

// Create reports directory if it doesn't exist
const reportsDir = path.join(__dirname, '../../reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

class ReportsController {
  /**
   * Get all reports
   */
  static async getAll(req, res, next) {
    try {
      const { status, type, limit = 10, offset = 0 } = req.query;

      const where = {
        ...(status && { status }),
        ...(type && { type }),
      };

      const [reports, total] = await Promise.all([
        prisma.report.findMany({
          where,
          include: {
            generator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.report.count({ where }),
      ]);

      res.json({
        success: true,
        reports,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get report by ID
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const report = await prisma.report.findUnique({
        where: { id },
        include: {
          generator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!report) {
        throw new NotFoundError('Report');
      }

      res.json({
        success: true,
        report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate report
   */
  static async generate(req, res, next) {
    try {
      const { type, resource, filters = {}, format = 'PDF' } = req.body;

      if (!type || !resource) {
        throw new ValidationError('Type and resource are required');
      }

      // Create report record
      const report = await prisma.report.create({
        data: {
          name: `${resource}_report_${Date.now()}`,
          type,
          resource,
          filters: filters,
          format,
          generatedBy: req.user.id,
          status: 'GENERATING',
        },
      });

      // Generate report asynchronously
      generateReportAsync(report.id, resource, filters, format, req.user.id);

      res.json({
        success: true,
        report: {
          id: report.id,
          name: report.name,
          status: report.status,
          format: report.format,
        },
        message: 'Report generation started',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download report
   */
  static async download(req, res, next) {
    try {
      const { id } = req.params;

      const report = await prisma.report.findUnique({
        where: { id },
      });

      if (!report) {
        throw new NotFoundError('Report');
      }

      if (report.status !== 'COMPLETED' || !report.fileUrl) {
        return res.status(400).json({
          success: false,
          error: 'Report is not ready for download',
        });
      }

      const filePath = path.join(__dirname, '../../', report.fileUrl);

      if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Report file');
      }

      res.download(filePath, (err) => {
        if (err) {
          console.error('Error downloading file:', err);
          res.status(500).json({
            success: false,
            error: 'Failed to download report',
          });
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete report
   */
  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const report = await prisma.report.findUnique({
        where: { id },
      });

      if (!report) {
        throw new NotFoundError('Report');
      }

      // Delete file if exists
      if (report.fileUrl) {
        const filePath = path.join(__dirname, '../../', report.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await prisma.report.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Report deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

// Helper function to generate report asynchronously
async function generateReportAsync(reportId, resource, filters, format, userId) {
  try {
    let data = [];
    let fileName = '';
    let filePath = '';

    // Fetch data based on resource
    switch (resource) {
      case 'users':
        data = await prisma.user.findMany({
          where: filters,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            location: true,
            isActive: true,
            createdAt: true,
          },
        });
        break;
      case 'bookings':
        data = await prisma.booking.findMany({
          where: filters,
          include: {
            customer: {
              select: {
                name: true,
                phone: true,
              },
            },
            venue: {
              select: {
                name: true,
                nameAr: true,
              },
            },
          },
        });
        break;
      case 'venues':
        data = await prisma.venue.findMany({
          where: filters,
          select: {
            id: true,
            name: true,
            nameAr: true,
            price: true,
            location: true,
            rating: true,
            reviewCount: true,
            isActive: true,
            createdAt: true,
          },
        });
        break;
      case 'services':
        data = await prisma.service.findMany({
          where: filters,
          select: {
            id: true,
            name: true,
            nameAr: true,
            price: true,
            location: true,
            rating: true,
            reviewCount: true,
            isActive: true,
            createdAt: true,
          },
        });
        break;
      case 'payments':
        data = await prisma.payment.findMany({
          where: filters,
          include: {
            booking: {
              select: {
                bookingNumber: true,
              },
            },
          },
        });
        break;
      default:
        throw new Error(`Unknown resource: ${resource}`);
    }

    // Generate file
    if (format === 'PDF') {
      fileName = `${resource}_report_${Date.now()}.pdf`;
      filePath = path.join(reportsDir, fileName);
      await generatePDF(data, resource, filePath);
    } else if (format === 'CSV') {
      fileName = `${resource}_report_${Date.now()}.csv`;
      filePath = path.join(reportsDir, fileName);
      await generateCSV(data, resource, filePath);
    }

    // Update report
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'COMPLETED',
        fileUrl: `/reports/${fileName}`,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'FAILED',
      },
    });
  }
}

async function generatePDF(data, resource, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text(`${resource.toUpperCase()} Report`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();

    if (data.length === 0) {
      doc.text('No data found');
      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
      return;
    }

    // Add data
    data.forEach((item, index) => {
      doc.fontSize(10).text(`Record ${index + 1}:`, { underline: true });
      Object.entries(item).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          doc.text(`${key}: ${JSON.stringify(value)}`);
        } else {
          doc.text(`${key}: ${value}`);
        }
      });
      doc.moveDown();
    });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function generateCSV(data, resource, filePath) {
  if (data.length === 0) {
    fs.writeFileSync(filePath, 'No data found\n');
    return;
  }

  const headers = Object.keys(data[0]).map((key) => ({
    id: key,
    title: key,
  }));

  const csvWriter = createCsvWriter({
    path: filePath,
    header: headers,
  });

  await csvWriter.writeRecords(data);
}

module.exports = ReportsController;


