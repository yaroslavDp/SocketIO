import { Router } from 'express';
import path from 'path';
import data from '../data';
import { HTML_FILES_PATH } from '../config';

const router = Router();

router.get('/', (req, res) => {
	const page = path.join(HTML_FILES_PATH, 'game.html');
	res.sendFile(page);
});
router.get('/texts/:id', (req,res) => {
	const id = req.params.id;
	const index = Number(id) - 1;
	return res.send({data: data.texts[index]})
})

export default router;
