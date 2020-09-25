import {Router} from 'express'
import User from './app/models/User'
const routes = new Router()

routes.get('/', async (req,res)=>{
    const user = await User.create({
        name: 'Dede',
        email: 'dede@gmail.com',
        password_hash: '59844879'
    })

    const user2 = await User.create({
        name: 'Mussun',
        email: 'mu@gmail.com',
        password_hash: '16844879'
    })
    return res.json(user2)
})

export default routes