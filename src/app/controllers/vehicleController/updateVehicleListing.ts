import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';

async function updateVehicleLising(req: Request, res: Response) {
	logger.info(`Editing vehicle with id '${req.params.id}'`);

	try {
		const vehicleId = req.params.id;
		const { currentUserId, ...newVehicleData } = req.body;

		if (Object.keys(newVehicleData).length === 0) {
			res.statusMessage = 'Bad request. No fields to update';
			res.status(400).send();
			return;
		}

		const vehicle = await vehicleRepository.getVehicleById(vehicleId);

		if (currentUserId !== vehicle[0].user_id_fk) {
			logger.error('Trying to edit someone else is vehicle listing');
			res.statusMessage =
				'Forbidden. Invalid credentials. You are not the owner of this vehicle listing';
			res.status(403).send();
			return;
		}

		const editVehicleResult = await vehicleRepository.updateVehicleWithId(
			req.params.id,
			newVehicleData
		);

		if (editVehicleResult.affectedRows === 1) {
			res.statusMessage = 'Vehicle edited successfully';
			res.status(200).send({
				message: 'Vehicle edited successfully',
			});
			return;
		}
	} catch (error) {
		logger.error(`Error editing vehicle: ${error}`);
		res.statusMessage = 'Internal Server Error';
		res.status(500).send();
		return;
	}
}

export default updateVehicleLising;
