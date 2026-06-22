import { EquipmentModel } from '../models/Equipment.model';
import { WorkOrderModel } from '../models/WorkOrder.model';
import { IncidentModel } from '../models/Incident.model';
import mongoose from 'mongoose';
import { getEquipmentSubgraph } from './kg.service';
import { GraphSubgraph } from '@ikip/shared';

export const createEquipment = async (data: any) => {
  const equipment = new EquipmentModel(data);
  await equipment.save();
  return equipment;
};

export const updateEquipment = async (tag: string, plantId: string, data: any) => {
  const equipment = await EquipmentModel.findOneAndUpdate(
    { tag, plant: new mongoose.Types.ObjectId(plantId) },
    data,
    { new: true }
  );
  if (!equipment) {
    throw new Error('Equipment not found');
  }
  return equipment;
};

export const listEquipment = async (
  plantId: string,
  filters: { equipmentClass?: string; operationalStatus?: string; criticality?: string },
  page = 1,
  limit = 20
) => {
  const query: any = { plant: new mongoose.Types.ObjectId(plantId) };
  if (filters.equipmentClass) {
    query.equipmentClass = filters.equipmentClass;
  }
  if (filters.operationalStatus) {
    query.operationalStatus = filters.operationalStatus;
  }
  if (filters.criticality) {
    query.criticality = filters.criticality;
  }

  const skip = (page - 1) * limit;
  const equipment = await EquipmentModel.find(query)
    .sort({ tag: 1 })
    .skip(skip)
    .limit(limit);

  const total = await EquipmentModel.countDocuments(query);
  return { equipment, total };
};

export const getEquipment360View = async (tag: string, plantId: string) => {
  const eq = await EquipmentModel.findOne({ tag, plant: new mongoose.Types.ObjectId(plantId) });
  if (!eq) {
    throw new Error('Equipment not found');
  }

  // 1. Fetch Work Orders
  const workOrders = await WorkOrderModel.find({ equipment: eq._id }).sort({ reportedAt: -1 });

  // 2. Fetch Incidents
  const incidents = await IncidentModel.find({ equipmentInvolved: eq._id }).sort({ occurredAt: -1 });

  // 3. Fetch KG Subgraph
  let kgSubgraph: GraphSubgraph = { nodes: [], edges: [] };
  try {
    kgSubgraph = await getEquipmentSubgraph(tag);
  } catch (err) {
    console.error('⚠️ Failed to load Neo4j subgraph for equipment passport:', err);
  }

  return {
    equipment: eq,
    workOrders,
    incidents,
    kgSubgraph,
  };
};

export const calculateMTBF = async (equipmentId: string): Promise<number> => {
  // Find completed corrective work orders
  const correctiveWOs = await WorkOrderModel.find({
    equipment: new mongoose.Types.ObjectId(equipmentId),
    woType: 'Corrective',
    status: 'Completed',
    completedAt: { $exists: true },
    reportedAt: { $exists: true },
  }).sort({ reportedAt: 1 });

  if (correctiveWOs.length <= 1) {
    return 0; // Not enough failure events to calculate MTBF
  }

  let totalIntervalHours = 0;
  for (let i = 1; i < correctiveWOs.length; i++) {
    const prevCompletion = correctiveWOs[i - 1].completedAt!;
    const nextReporting = correctiveWOs[i].reportedAt!;
    const diffMs = nextReporting.getTime() - prevCompletion.getTime();
    totalIntervalHours += Math.max(0, diffMs / (1000 * 60 * 60));
  }

  const mtbf = totalIntervalHours / (correctiveWOs.length - 1);
  
  // Update in DB
  await EquipmentModel.findByIdAndUpdate(equipmentId, { mtbf });

  return mtbf;
};
