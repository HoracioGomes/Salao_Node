import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore } from 'date-fns';
import User from '../models/User';
import Appointment from '../models/Appointment';

class AppointmentController {
  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'validation fails' });
    }

    const { provider_id, date } = req.body;

    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    if (!isProvider) {
      return res
        .status(401)
        .json({ error: 'Esse usuário nao é um prestador de serviço!' });
    }

    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Essa data ja passou!' });
    }

    const checkNaoDisponivel = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date,
      },
    });

    if (checkNaoDisponivel) {
      return res.status(400).json({ erro: 'Essa data não está disponível!' });
    }

    // eslint-disable-next-line no-unused-vars
    const appointment = await Appointment.create({
      user_id: req.user_id,
      provider_id,
      date: hourStart,
    });

    return res.status(200).json(`Agendado!`);
  }
}

export default new AppointmentController();
