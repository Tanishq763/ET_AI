import { WorkOrderModel } from '../models/WorkOrder.model';
import mongoose from 'mongoose';
import axios from 'axios';
import { env } from '../config/env';
import { calculateMTBF } from './equipment.service';
import { emitToPlant } from '../socket/socket.manager';
import { SOCKET_EVENTS } from '../socket/events';

export const createWorkOrder = async (data: any) => {
  const wo = new WorkOrderModel(data);
  await wo.save();
  return wo;
};

export const listWorkOrders = async (
  plantId: string,
  filters: { equipment?: string; woType?: string; status?: string },
  page = 1,
  limit = 20
) => {
  const query: any = { plant: new mongoose.Types.ObjectId(plantId) };
  if (filters.equipment) {
    query.equipment = new mongoose.Types.ObjectId(filters.equipment);
  }
  if (filters.woType) {
    query.woType = filters.woType;
  }
  if (filters.status) {
    query.status = filters.status;
  }

  const skip = (page - 1) * limit;
  const workOrders = await WorkOrderModel.find(query)
    .sort({ reportedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('equipment', 'tag equipmentClass');

  const total = await WorkOrderModel.countDocuments(query);
  return { workOrders, total };
};

export const getWorkOrderDetail = async (woId: string) => {
  return WorkOrderModel.findById(woId).populate('equipment', 'tag equipmentClass location');
};

export const runRCAAnalysis = async (woId: string) => {
  const wo = await WorkOrderModel.findById(woId).populate('equipment');
  if (!wo) {
    throw new Error('Work Order not found');
  }

  try {
    const response = await axios.post(`${env.AI_SERVICES_URL}/rca/analyze`, {
      workOrderId: wo._id.toString(),
      equipmentTag: wo.equipmentTag || (wo.equipment as any)?.tag,
      plantId: wo.plant.toString(),
    });

    const { rootCause, failureMode, recommendations, confidence } = response.data;

    // Update in database
    wo.rootCause = rootCause;
    wo.failureMode = failureMode;
    wo.aiRcaSuggestion = rootCause;
    wo.aiRcaConfidence = confidence;
    await wo.save();

    // Trigger MTBF recalculation if completed corrective
    if (wo.woType === 'Corrective' && wo.status === 'Completed' && wo.equipment) {
      await calculateMTBF(wo.equipment._id.toString());
    }

    // Broadcast to supervisor room
    emitToPlant(wo.plant.toString(), SOCKET_EVENTS.WORKORDER_RCA_READY, {
      workOrderId: wo._id.toString(),
      rcaSummary: rootCause,
    });

    return { wo, recommendations };
  } catch (err: any) {
    console.error('❌ RCA Analysis microservice failure:', err.message);
    throw new Error(`RCA failed: ${err.message}`);
  }
};
