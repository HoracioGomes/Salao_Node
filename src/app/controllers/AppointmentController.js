import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointment';
import Notification from '../schemas/Notification';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      attributes: ['id', 'date'],
      order: ['date'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });

    return res.json(appointments);
  }

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
      user_id: req.userId,
      provider_id,
      date: hourStart,
    });

    const formattedDate = format(hourStart, "'dia' dd 'de' MMM', às' H:mm'h'", {
      locale: pt,
    });

    const user = await User.findByPk(req.userId);

    if (req.userId === provider_id) {
      return res
        .status(401)
        .json({ error: 'O usuário não pode agendar para ele mesmo!' });
    }

    await Notification.create({
      content: `Novo agendamento de ${user.name} para ${formattedDate}`,
      user: provider_id,
    });

    return res.status(200).json(`Agendado!`);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id);

    // eslint-disable-next-line eqeqeq
    if (appointment.user_id != req.userId) {
      return res
        .status(401)
        .json({ error: 'Somente o solicitante pode cancelar o agendamento!' });
    }
    const dateWhiteSub = subHours(appointment.date, 2);

    if (isBefore(dateWhiteSub, new Date())) {
      return res.status(401).json({
        error:
          'Só é permitido o cancelamento antes de duas horas do agendamento!',
      });
    }
    appointment.canceled_at = new Date();

    await appointment.save();

    return res.json(appointment);
  }
}

export default new AppointmentController();
