import mainApp from "../src/main"
import { treaty } from '@elysiajs/eden'

const client = treaty<typeof mainApp>("localhost:3000")

const res = await client.workers({
    name: "default"
}).stop.post()

console.log(res.data)

