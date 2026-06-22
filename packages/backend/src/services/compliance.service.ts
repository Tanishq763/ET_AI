import { ComplianceMappingModel } from '../models/ComplianceMapping.model';
import mongoose from 'mongoose';
import { complianceQueue } from '../jobs/queues';

export const listComplianceGaps = async (
  plantId: string,
  filters: { regulationCode?: string; complianceStatus?: string },
  page = 1,
  limit = 20
) => {
  const query: any = { plant: new mongoose.Types.ObjectId(plantId) };
  if (filters.regulationCode) {
    query.regulationCode = filters.regulationCode;
  }
  if (filters.complianceStatus) {
    query.complianceStatus = filters.complianceStatus;
  }

  const skip = (page - 1) * limit;
  const gaps = await ComplianceMappingModel.find(query)
    .sort({ severity: 1, lastAssessedAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await ComplianceMappingModel.countDocuments(query);
  return { gaps, total };
};

export const getComplianceDashboardSummary = async (plantId: string) => {
  const pid = new mongoose.Types.ObjectId(plantId);
  const byRegulation = await ComplianceMappingModel.aggregate([
    { $match: { plant: pid } },
    {
      $group: {
        _id: '$regulationCode',
        total: { $sum: 1 },
        compliantCount: {
          $sum: { $cond: [{ $eq: ['$complianceStatus', 'Compliant'] }, 1, 0] },
        },
        nonCompliantCount: {
          $sum: { $cond: [{ $eq: ['$complianceStatus', 'NonCompliant'] }, 1, 0] },
        },
        partialCount: {
          $sum: { $cond: [{ $eq: ['$complianceStatus', 'PartiallyCompliant'] }, 1, 0] },
        },
      },
    },
  ]);

  const gapCount = await ComplianceMappingModel.countDocuments({
    plant: pid,
    complianceStatus: { $in: ['NonCompliant', 'PartiallyCompliant'] },
  });

  const criticalGaps = await ComplianceMappingModel.countDocuments({
    plant: pid,
    complianceStatus: 'NonCompliant',
    severity: 'Critical',
  });

  return {
    byRegulation,
    gapCount,
    criticalGaps,
  };
};

export const triggerComplianceScan = async (plantId: string, regulations?: string[]) => {
  const job = await complianceQueue.add('compliance-scan', {
    plantId,
    regulations: regulations || ['OISD-118', 'FactoryAct-1948-S7', 'PESO-2016'],
  });
  return job.id || '';
};
