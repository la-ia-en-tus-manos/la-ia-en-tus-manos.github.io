// Textos de la interfaz del alumno en cada idioma. El panel del profesor es siempre en español.
import { guardarLocal, leerLocal } from './ui.js';

export const IDIOMAS = { es: 'Español', 'pt-BR': 'Português (Brasil)' };
export const IDIOMA_DEFECTO = 'es';

const D = {
  es: {
    cargando: 'Cargando…', reintentar: 'Volver a intentarlo', algo_mal: 'Algo no ha ido bien. ', cerrar: 'Cerrar', guardar: 'Guardar', cancelar: 'Cancelar',
    copiado: 'Copiado. Ahora pégalo en Gemini', no_copiado: 'No se ha podido copiar. Selecciona el texto y cópialo', copiar: 'Copiar',
    sin_conexion: 'Sin conexión. Inténtalo de nuevo', sin_servidor: 'No se ha podido hablar con el servidor. Comprueba la conexión',
    modo_movil: 'Solo móvil', modo_portatil: 'Solo portátil', modo_ambos: 'Móvil y portátil',
    // inscripción
    pildora_taller: 'Taller práctico {n} · nivel {nivel}', titulo_1: 'La IA en ', titulo_2: 'tus manos',
    intro: 'Cuatro horas para aprender haciendo, con Gemini. Sin conocimientos previos, sin teclear y con forma de juego: misiones, sellos y medallas secretas.',
    cuando: 'Cuándo: ', fecha_por_confirmar: 'fecha por confirmar. Te avisaremos por correo.', donde: 'Dónde: ', ver_mapa: 'ver mapa',
    que_traer: 'Qué traer: ', que_traer_txt: 'tu móvil con tu cuenta de Google. Si tienes portátil, mejor con los dos.',
    ya_inscrito_aqui: 'Ya tienes una inscripción en este dispositivo.', abrir_enlace: 'Abrir mi enlace personal',
    abrira_pronto: 'La inscripción se abrirá pronto', vuelve: 'Vuelve a pasar por aquí en unos días.',
    cerrada: 'La inscripción está cerrada', cerrada_txt: 'Si ya estás inscrito, abre el enlace personal que recibiste por correo.',
    completas: 'Plazas y lista de espera completas', completas_txt: 'Lo sentimos. Si se abre otra edición te lo contaremos por aquí.',
    plazas_completas: 'Plazas completas. ', espera_txt: 'Puedes apuntarte a la lista de espera (quedan {n} sitios): si alguien deja su plaza, serás de los primeros en entrar.',
    quedan: 'Quedan {libres} plazas de {total}.', apuntate_espera: 'Apúntate a la lista de espera', reserva: 'Reserva tu plaza',
    idioma_label: 'Idioma / Idioma', nombre: 'Nombre y apellidos', nombre_ph: 'Tal como quieres que salgan en el certificado',
    correo: 'Correo electrónico', correo_ph: 'Ahí te enviaremos tu enlace personal', telefono: 'Teléfono (opcional)', telefono_ayuda: 'Solo si quieres entrar en el grupo de WhatsApp del taller.',
    con_que: '¿Con qué vendrás?', personaje_pregunta: 'Tu personaje del taller', personaje_ayuda: 'Durante el taller serás una persona inventada, con su caso. ¿Cómo prefieres que sea?',
    personaje_f: 'Una mujer', personaje_m: 'Un hombre', personaje_x: 'Me da igual', modo_ambos_sub: 'La opción más cómoda', modo_movil_sub: 'Con la app de Gemini', modo_portatil_sub: 'Con gemini.google.com',
    cambiar_despues: 'Podrás cambiarlo después desde tu enlace personal.',
    consiento_1: 'Acepto que ', organizador: 'el organizador del taller', consiento_2: ' guarde estos datos para gestionar mi plaza, el taller y el certificado. ', contacto: ' Contacto: {correo}.',
    avisos: 'Quiero que me avisen de futuros talleres.', campo_trampa: 'Deja este campo vacío',
    apuntarme_espera: 'Apuntarme a la espera', apuntarme: 'Apuntarme al taller', enviando: 'Enviando…',
    err_nombre: 'Escribe tu nombre y al menos un apellido.', err_correo: 'Revisa el correo: no parece una dirección válida.', err_consentimiento: 'Necesitamos tu consentimiento para guardar la inscripción.',
    ya_estabas: 'Ya estabas inscrito', reenviado: 'Te hemos reenviado tu enlace personal al correo. Si no lo ves, mira en «Correo no deseado».',
    // alumno común
    falta_enlace: 'Falta tu enlace personal', falta_enlace_txt: 'Abre el enlace que recibiste por correo al inscribirte. Si no lo encuentras, vuelve a inscribirte con el mismo correo y te lo reenviamos.', ir_inscripcion: 'Ir a la inscripción',
    hola: 'Hola, {nombre}', explorador: 'Explorador', numero: 'n.º {n}',
    // espera
    tienes_plaza: '¡Tienes plaza! ', guarda_enlace: 'Te hemos enviado este enlace por correo. Guárdalo: lo necesitarás el día del taller.',
    cuenta_atras: 'Cuenta atrás', es_hoy: '¡Es hoy! El profesor abrirá el taller desde la sala.', dias: 'días', horas: 'horas', min: 'min', seg: 'seg',
    anadir_calendario: 'Añadir al calendario', fecha: 'Fecha', fecha_por_confirmar_t: 'Fecha por confirmar', avisaremos: 'Te avisaremos por correo en cuanto la tengamos.',
    mensaje_profesor: 'Mensaje del profesor: ', caso_bloqueado: 'Tu caso se abrirá el día del taller',
    preparacion: 'Preparación · {hechas} de {total}', previas: 'Misiones previas', previas_txt: 'Cúmplelas en casa. Así el día del taller vamos directos a jugar.',
    te_falta: 'Te falta: {lista}.', todo_listo: '¡Todo listo! Nos vemos en el taller.', marcar: 'Marcar como hecha', desmarcar: 'Desmarcar', previa_cumplida: 'Misión previa cumplida',
    tu_inscripcion: 'Tu inscripción', vendras_con: 'Vendrás con: ', cambiar: 'cambiar', idioma: 'Idioma: ', grupo_whatsapp: 'Entrar en el grupo de WhatsApp',
    abre_portatil: 'Abre este mismo enlace en el portátil si vas a traerlo: tu progreso se verá igual en los dos.', cancelar_plaza: 'No puedo ir: cancelar mi plaza',
    con_que_taller: '¿Con qué vas a hacer el taller?', seguro_cancelar: '¿Seguro que cancelas tu plaza?', cancelar_txt: 'Tu sitio pasará a la primera persona de la lista de espera. Si cambias de idea tendrás que volver a inscribirte.',
    si_cancelar: 'Sí, cancelar mi plaza', no_me_quedo: 'No, me la quedo', elegir_idioma: '¿En qué idioma quieres el taller?',
    lista_espera: 'Lista de espera', posicion_espera: 'Eres el n.º {n} de la lista de espera', espera_sube: 'Si alguien deja su plaza, subirás automáticamente y te avisaremos por correo. Esta página también se actualizará sola.',
    salir_espera: 'Salir de la lista de espera', plaza_cancelada: 'Tu plaza está cancelada', plaza_cancelada_txt: 'Si quieres volver, inscríbete de nuevo con el mismo correo.',
    // taller
    empieza: '¡Empieza el taller!', con_que_hoy: '¿Con qué estás hoy?', pasos_adaptan: 'Los pasos de cada misión se adaptan a lo que tengas delante.', abrir_caso: 'Abrir mi caso',
    caso_no_disponible: 'Tu caso aún no está disponible. Avisa al profesor.', tu_personaje: 'Tu personaje', anos: '{n} años', lo_que_sabes: 'Lo que tú sabes',
    datos_ficticios: 'Tus datos ficticios: DNI {dni} · {domicilio}', medallas_secretas: 'Medallas secretas', tres_medallas: 'Tres medallas por descubrir',
    medallas_txt: 'Nadie sabe cómo se ganan hasta el final. Si el profesor te dice una palabra secreta, escríbela aquí.', palabra_secreta: 'Palabra secreta', probar: 'Probar',
    misiones_sellos: 'Misiones · {hechas} de {total} sellos', mapa_dia: 'Mapa del día', extra: 'Misiones extra', sobra_tiempo: '¿Te sobra tiempo?',
    ayuda_pedida: 'El profesor ya sabe que necesitas ayuda. Ahora va', aviso_retirado: 'Aviso retirado', ayuda_cancelar: 'Ayuda pedida · cancelar', ayuda: '¡AYUDA!',
    medalla_desbloqueada: 'Medalla secreta desbloqueada', genial: '¡Genial!',
    // misión
    mapa: 'Mapa del día', explorador_n: 'Explorador n.º {n}', jefe_final: 'Jefe final · {min} min', mision_n: 'Misión {n} · {min} min', pasos: 'Pasos',
    tus_prompts: 'Tus prompts', tu_prompt: 'Tu prompt', pista_ambos: 'Léelo en el portátil y díctaselo a Gemini con el micrófono del móvil.', pista_copiar: 'Toca «Copiar» y pégalo en Gemini.',
    m3b_titulo: 'M3-B · el prompt bueno, en sus cinco piezas', m3b_completo: 'M3-B · completo para copiar', m3a: 'M3-A · el prompt flojo',
    piezas: ['Quién soy', 'Qué ha pasado', 'Qué quiero', 'Reglas', 'Formato'],
    cumplida_cuando: 'Misión cumplida cuando…', jefe_superado: '¡Jefe final superado! ', jefe_validado: 'El profesor ha validado tu reto.',
    codigo_profesor: 'Código del profesor', validar: 'Validar', jefe_txt: 'Enséñale tu reto al profesor: él lo valida desde su panel o te dice un código.',
    sello: '¡Sello conseguido!', mision_cumplida: '¡Misión cumplida!', desmarcar_mision: 'Misión cumplida · desmarcar',
    img_documento: 'Tu documento', img_cartel: 'Tu cartel', img_mensaje: 'Tu mensaje sospechoso', img_tickets: 'Tus tickets', cargando_imagen: 'Cargando la imagen…',
    tus_documentos: 'Tus documentos', documentos_txt: 'Descárgalos y súbelos a tu cuaderno. Son inventados, como todo lo de Villademo.', descargado: 'Descargado',
    tu_proyecto: 'Tu proyecto', tarjeta_instrucciones: 'instrucciones', tarjeta_indicacion: 'no es un prompt', tarjeta_opcional: 'si vas rápido',
    version_retocada: 'Esta es tu versión retocada: es la que se envía y se descarga.', toca_imagen: 'Toca la imagen para verla a pantalla completa.',
    rotulador: 'Rotulador', compartir_gemini: 'Compartir con Gemini', descargar_imagen: 'Descargar imagen', no_compartir: 'No se ha podido compartir. Usa «Descargar imagen»',
    nota_compartir: 'En la lista que se abre, elige Gemini. Si no aparece, descárgala y súbela en Gemini con el botón +.',
    copiar_imagen: 'Copiar imagen', imagen_copiada: 'Imagen copiada. En Gemini, pégala en el chat con Ctrl+V', no_copiar_imagen: 'No se ha podido copiar. Descárgala y arrástrala a Gemini',
    nota_copiar: 'Copia la imagen y pégala en el chat de Gemini con Ctrl+V. O descárgala y arrástrala al chat.', nota_descargar: 'Descárgala y arrástrala al chat de Gemini, o súbela con el botón +.',
    de: 'de {quien}',
    // rotulador
    rotulador_txt: 'Pinta con el dedo o el ratón sobre la imagen, como con un rotulador. Lo que pintes quedará así al enviarla.', deshacer: 'Deshacer', borrar_todo: 'Borrar todo', listo: 'Listo', nada_pintado: 'No has pintado nada todavía',
    // cierre
    se_desvela: 'Se desvela el secreto', tres_medallas_t: 'Las tres medallas secretas', la_tuya: '¡La tuya!', tu_dia: 'Tu día',
    resumen_dia: '{sellos} sellos · {medallas} medallas · jefe final {jefe}', superado: 'superado', pendiente: 'pendiente',
    gracias: '¡Gracias! ', certificado_nombre: 'Tu certificado saldrá a nombre de ', tus_prompts_volver: 'Tus prompts, para volver a usarlos',
    sustituye: 'Sustituye los datos de tu personaje por los tuyos, y recuerda el escudo: nada de DNI ni cuentas.',
    antes_irte: 'Antes de irte', nombre_certificado: 'Nombre para el certificado', revisalo: 'Revísalo: así saldrá impreso.',
    seguro_ia: '¿Cómo de seguro te sientes ahora usando IA? (1 = nada, 5 = mucho)', mision_util: '¿Qué misión te ha resultado más útil?', elige: 'Elige una',
    mejorarias: '¿Qué mejorarías?', mejorar_ph: 'Lo que quieras contarnos', aviso_t2: 'Avísame de los próximos talleres.', enviar: 'Enviar',
    err_seguridad: 'Dinos de 1 a 5 cómo de seguro te sientes', gracias_proximo: '¡Gracias! Hasta el próximo taller',
    encuesta_titulo: 'Tu opinión, en un minuto', encuesta_intro: 'Nos ayuda a mejorar el taller. Es anónima para el resto del grupo.',
    val_general: 'El taller en general', val_profesor: 'El profesor: claridad y cercanía', val_contenido: 'El contenido: útil y a tu nivel', val_ritmo: 'El ritmo y la duración', val_app: 'La app y los materiales',
    val_min: '1 = muy mal', val_max: '5 = muy bien', recomendaria: '¿Recomendarías este taller a un amigo o familiar?', reco_min: '0 = nunca', reco_max: '10 = sin duda',
    lo_mejor: '¿Qué es lo que más te ha gustado?', lo_mejor_ph: 'Lo que te llevas', err_valoracion: 'Falta valorar: {que}', err_recomendaria: 'Dinos de 0 a 10 si lo recomendarías',
    gemini_titulo: 'Cómo entrar en Gemini', gemini_intro: 'Gemini es la inteligencia artificial de Google que usaremos en el taller. Es gratis; solo hace falta una cuenta de Google (la de Gmail).',
    gemini_sin_cuenta_1: 'Si no tienes cuenta de Google: ', gemini_sin_cuenta_2: 'créala aquí', gemini_sin_cuenta_3: '. Te pedirá nombre, una dirección de correo nueva, una contraseña y tu número de móvil para enviarte un código.',
    gemini_con_cuenta_1: 'Si ya tienes cuenta (Gmail): entra en ', gemini_con_cuenta_2: '. También lo tienes dentro de Gmail: pulsa el icono de los nueve puntitos (arriba a la derecha) y elige Gemini.',
    gemini_app_1: 'En el móvil: instala la app Gemini desde ', gemini_app_android: 'Google Play', gemini_app_o: ' (Android) o la ', gemini_app_ios: 'App Store', gemini_app_2: ' (iPhone) y entra con tu cuenta.',
    abrir_gemini: 'Abrir Gemini', crear_cuenta: 'Crear cuenta de Google', otra_edicion: 'Este enlace es de otro taller',
    dip_conseguida: 'conseguida', dip_pendiente: 'pendiente', dip_resumen: '{medallas} de {total} medallas · {misiones} de {total_misiones} misiones', dip_jefe: 'jefe final superado',
    dip_imprimir: 'Imprimir o guardar en PDF', dip_demo: 'Muestra con datos inventados', ver_diploma: 'Ver mi diploma'
  },
  'pt-BR': {
    cargando: 'Carregando…', reintentar: 'Tentar de novo', algo_mal: 'Algo deu errado. ', cerrar: 'Fechar', guardar: 'Salvar', cancelar: 'Cancelar',
    copiado: 'Copiado. Agora cole no Gemini', no_copiado: 'Não foi possível copiar. Selecione o texto e copie', copiar: 'Copiar',
    sin_conexion: 'Sem conexão. Tente de novo', sin_servidor: 'Não foi possível falar com o servidor. Confira a conexão',
    modo_movil: 'Só celular', modo_portatil: 'Só notebook', modo_ambos: 'Celular e notebook',
    pildora_taller: 'Oficina prática {n} · nível {nivel}', titulo_1: 'A IA nas ', titulo_2: 'suas mãos',
    intro: 'Quatro horas para aprender fazendo, com o Gemini. Sem conhecimentos prévios, sem digitar e em forma de jogo: missões, carimbos e medalhas secretas.',
    cuando: 'Quando: ', fecha_por_confirmar: 'data a confirmar. Avisaremos por e-mail.', donde: 'Onde: ', ver_mapa: 'ver mapa',
    que_traer: 'O que trazer: ', que_traer_txt: 'seu celular com sua conta do Google. Se tiver notebook, melhor com os dois.',
    ya_inscrito_aqui: 'Você já tem uma inscrição neste aparelho.', abrir_enlace: 'Abrir meu link pessoal',
    abrira_pronto: 'As inscrições abrem em breve', vuelve: 'Volte a passar por aqui em alguns dias.',
    cerrada: 'As inscrições estão encerradas', cerrada_txt: 'Se você já está inscrito, abra o link pessoal que recebeu por e-mail.',
    completas: 'Vagas e lista de espera completas', completas_txt: 'Sentimos muito. Se abrir outra edição, contaremos por aqui.',
    plazas_completas: 'Vagas completas. ', espera_txt: 'Você pode entrar na lista de espera (restam {n} lugares): se alguém desistir, você será dos primeiros a entrar.',
    quedan: 'Restam {libres} vagas de {total}.', apuntate_espera: 'Entre na lista de espera', reserva: 'Reserve sua vaga',
    idioma_label: 'Idioma / Idioma', nombre: 'Nome e sobrenome', nombre_ph: 'Como você quer que apareçam no certificado',
    correo: 'E-mail', correo_ph: 'Enviaremos seu link pessoal para lá', telefono: 'Telefone (opcional)', telefono_ayuda: 'Só se quiser entrar no grupo de WhatsApp da oficina.',
    con_que: 'Com o que você virá?', personaje_pregunta: 'Seu personagem da oficina', personaje_ayuda: 'Durante a oficina você será uma pessoa inventada, com o caso dela. Como prefere que seja?',
    personaje_f: 'Uma mulher', personaje_m: 'Um homem', personaje_x: 'Tanto faz', modo_ambos_sub: 'A opção mais cômoda', modo_movil_sub: 'Com o app do Gemini', modo_portatil_sub: 'Com gemini.google.com',
    cambiar_despues: 'Você poderá mudar depois pelo seu link pessoal.',
    consiento_1: 'Aceito que ', organizador: 'o organizador da oficina', consiento_2: ' guarde estes dados para gerenciar minha vaga, a oficina e o certificado. ', contacto: ' Contato: {correo}.',
    avisos: 'Quero ser avisado de futuras oficinas.', campo_trampa: 'Deixe este campo vazio',
    apuntarme_espera: 'Entrar na lista de espera', apuntarme: 'Quero participar', enviando: 'Enviando…',
    err_nombre: 'Escreva seu nome e pelo menos um sobrenome.', err_correo: 'Confira o e-mail: não parece um endereço válido.', err_consentimiento: 'Precisamos do seu consentimento para guardar a inscrição.',
    ya_estabas: 'Você já estava inscrito', reenviado: 'Reenviamos seu link pessoal para o e-mail. Se não encontrar, olhe em «Spam».',
    falta_enlace: 'Falta o seu link pessoal', falta_enlace_txt: 'Abra o link que você recebeu por e-mail ao se inscrever. Se não encontrar, inscreva-se de novo com o mesmo e-mail e reenviaremos.', ir_inscripcion: 'Ir para a inscrição',
    hola: 'Olá, {nombre}', explorador: 'Explorador', numero: 'n.º {n}',
    tienes_plaza: 'Você tem vaga! ', guarda_enlace: 'Enviamos este link por e-mail. Guarde: você vai precisar dele no dia da oficina.',
    cuenta_atras: 'Contagem regressiva', es_hoy: 'É hoje! O professor abrirá a oficina na sala.', dias: 'dias', horas: 'horas', min: 'min', seg: 'seg',
    anadir_calendario: 'Adicionar ao calendário', fecha: 'Data', fecha_por_confirmar_t: 'Data a confirmar', avisaremos: 'Avisaremos por e-mail assim que tivermos.',
    mensaje_profesor: 'Mensagem do professor: ', caso_bloqueado: 'Seu caso abre no dia da oficina',
    preparacion: 'Preparação · {hechas} de {total}', previas: 'Missões prévias', previas_txt: 'Faça em casa. Assim, no dia da oficina, vamos direto ao jogo.',
    te_falta: 'Falta: {lista}.', todo_listo: 'Tudo pronto! Nos vemos na oficina.', marcar: 'Marcar como feita', desmarcar: 'Desmarcar', previa_cumplida: 'Missão prévia cumprida',
    tu_inscripcion: 'Sua inscrição', vendras_con: 'Você virá com: ', cambiar: 'mudar', idioma: 'Idioma: ', grupo_whatsapp: 'Entrar no grupo de WhatsApp',
    abre_portatil: 'Abra este mesmo link no notebook se for trazê-lo: seu progresso aparece igual nos dois.', cancelar_plaza: 'Não posso ir: cancelar minha vaga',
    con_que_taller: 'Com o que você vai fazer a oficina?', seguro_cancelar: 'Tem certeza de que quer cancelar sua vaga?', cancelar_txt: 'Seu lugar passará para a primeira pessoa da lista de espera. Se mudar de ideia, terá que se inscrever de novo.',
    si_cancelar: 'Sim, cancelar minha vaga', no_me_quedo: 'Não, fico com ela', elegir_idioma: 'Em que idioma você quer a oficina?',
    lista_espera: 'Lista de espera', posicion_espera: 'Você é o n.º {n} da lista de espera', espera_sube: 'Se alguém desistir, você sobe automaticamente e avisaremos por e-mail. Esta página também se atualiza sozinha.',
    salir_espera: 'Sair da lista de espera', plaza_cancelada: 'Sua vaga está cancelada', plaza_cancelada_txt: 'Se quiser voltar, inscreva-se de novo com o mesmo e-mail.',
    empieza: 'Começa a oficina!', con_que_hoy: 'Com o que você está hoje?', pasos_adaptan: 'Os passos de cada missão se adaptam ao que você tem na frente.', abrir_caso: 'Abrir meu caso',
    caso_no_disponible: 'Seu caso ainda não está disponível. Avise o professor.', tu_personaje: 'Seu personagem', anos: '{n} anos', lo_que_sabes: 'O que você sabe',
    datos_ficticios: 'Seus dados fictícios: DNI {dni} · {domicilio}', medallas_secretas: 'Medalhas secretas', tres_medallas: 'Três medalhas para descobrir',
    medallas_txt: 'Ninguém sabe como se ganham até o final. Se o professor disser uma palavra secreta, escreva aqui.', palabra_secreta: 'Palavra secreta', probar: 'Testar',
    misiones_sellos: 'Missões · {hechas} de {total} carimbos', mapa_dia: 'Mapa do dia', extra: 'Missões extras', sobra_tiempo: 'Sobrou tempo?',
    ayuda_pedida: 'O professor já sabe que você precisa de ajuda. Ele já vem', aviso_retirado: 'Aviso retirado', ayuda_cancelar: 'Ajuda pedida · cancelar', ayuda: 'AJUDA!',
    medalla_desbloqueada: 'Medalha secreta desbloqueada', genial: 'Demais!',
    mapa: 'Mapa do dia', explorador_n: 'Explorador n.º {n}', jefe_final: 'Chefe final · {min} min', mision_n: 'Missão {n} · {min} min', pasos: 'Passos',
    tus_prompts: 'Seus prompts', tu_prompt: 'Seu prompt', pista_ambos: 'Leia no notebook e dite para o Gemini com o microfone do celular.', pista_copiar: 'Toque em «Copiar» e cole no Gemini.',
    m3b_titulo: 'M3-B · o prompt bom, nas suas cinco peças', m3b_completo: 'M3-B · completo para copiar', m3a: 'M3-A · o prompt fraco',
    piezas: ['Quem sou', 'O que aconteceu', 'O que quero', 'Regras', 'Formato'],
    cumplida_cuando: 'Missão cumprida quando…', jefe_superado: 'Chefe final superado! ', jefe_validado: 'O professor validou seu desafio.',
    codigo_profesor: 'Código do professor', validar: 'Validar', jefe_txt: 'Mostre seu desafio ao professor: ele valida pelo painel ou diz um código.',
    sello: 'Carimbo conquistado!', mision_cumplida: 'Missão cumprida!', desmarcar_mision: 'Missão cumprida · desmarcar',
    img_documento: 'Seu documento', img_cartel: 'Seu cartaz', img_mensaje: 'Sua mensagem suspeita', img_tickets: 'Seus recibos', cargando_imagen: 'Carregando a imagem…',
    tus_documentos: 'Seus documentos', documentos_txt: 'Baixe-os e envie para o seu caderno. São inventados, como tudo em Villademo.', descargado: 'Baixado',
    tu_proyecto: 'Seu projeto', tarjeta_instrucciones: 'instruções', tarjeta_indicacion: 'não é um prompt', tarjeta_opcional: 'se estiver rápido',
    version_retocada: 'Esta é a sua versão retocada: é a que se envia e se baixa.', toca_imagen: 'Toque na imagem para ver em tela cheia.',
    rotulador: 'Caneta', compartir_gemini: 'Compartilhar com o Gemini', descargar_imagen: 'Baixar imagem', no_compartir: 'Não foi possível compartilhar. Use «Baixar imagem»',
    nota_compartir: 'Na lista que abrir, escolha Gemini. Se não aparecer, baixe a imagem e envie no Gemini com o botão +.',
    copiar_imagen: 'Copiar imagem', imagen_copiada: 'Imagem copiada. No Gemini, cole no chat com Ctrl+V', no_copiar_imagen: 'Não foi possível copiar. Baixe e arraste para o Gemini',
    nota_copiar: 'Copie a imagem e cole no chat do Gemini com Ctrl+V. Ou baixe e arraste para o chat.', nota_descargar: 'Baixe e arraste para o chat do Gemini, ou envie com o botão +.',
    de: 'de {quien}',
    rotulador_txt: 'Pinte com o dedo ou o mouse sobre a imagem, como com uma caneta marcadora. O que você pintar fica assim ao enviar.', deshacer: 'Desfazer', borrar_todo: 'Apagar tudo', listo: 'Pronto', nada_pintado: 'Você ainda não pintou nada',
    se_desvela: 'O segredo é revelado', tres_medallas_t: 'As três medalhas secretas', la_tuya: 'A sua!', tu_dia: 'Seu dia',
    resumen_dia: '{sellos} carimbos · {medallas} medalhas · chefe final {jefe}', superado: 'superado', pendiente: 'pendente',
    gracias: 'Obrigado! ', certificado_nombre: 'Seu certificado sairá em nome de ', tus_prompts_volver: 'Seus prompts, para usar de novo',
    sustituye: 'Troque os dados do seu personagem pelos seus, e lembre do escudo: nada de DNI nem contas.',
    antes_irte: 'Antes de ir', nombre_certificado: 'Nome para o certificado', revisalo: 'Confira: é assim que vai sair impresso.',
    seguro_ia: 'Quão seguro você se sente agora usando IA? (1 = nada, 5 = muito)', mision_util: 'Qual missão foi mais útil para você?', elige: 'Escolha uma',
    mejorarias: 'O que você melhoraria?', mejorar_ph: 'O que quiser nos contar', aviso_t2: 'Me avise das próximas oficinas.', enviar: 'Enviar',
    err_seguridad: 'Diga de 1 a 5 quão seguro você se sente', gracias_proximo: 'Obrigado! Até a próxima oficina',
    encuesta_titulo: 'Sua opinião, em um minuto', encuesta_intro: 'Ela nos ajuda a melhorar a oficina. É anônima para o resto do grupo.',
    val_general: 'A oficina em geral', val_profesor: 'O professor: clareza e proximidade', val_contenido: 'O conteúdo: útil e no seu nível', val_ritmo: 'O ritmo e a duração', val_app: 'O app e os materiais',
    val_min: '1 = muito ruim', val_max: '5 = muito bom', recomendaria: 'Você recomendaria esta oficina a um amigo ou familiar?', reco_min: '0 = nunca', reco_max: '10 = com certeza',
    lo_mejor: 'Do que você mais gostou?', lo_mejor_ph: 'O que você leva', err_valoracion: 'Falta avaliar: {que}', err_recomendaria: 'Diga de 0 a 10 se recomendaria',
    gemini_titulo: 'Como entrar no Gemini', gemini_intro: 'O Gemini é a inteligência artificial do Google que usaremos na oficina. É grátis; só precisa de uma conta do Google (a do Gmail).',
    gemini_sin_cuenta_1: 'Se você não tem conta do Google: ', gemini_sin_cuenta_2: 'crie aqui', gemini_sin_cuenta_3: '. Vai pedir nome, um endereço de e-mail novo, uma senha e seu número de celular para enviar um código.',
    gemini_con_cuenta_1: 'Se você já tem conta (Gmail): entre em ', gemini_con_cuenta_2: '. Também está dentro do Gmail: toque no ícone dos nove pontinhos (no canto superior direito) e escolha Gemini.',
    gemini_app_1: 'No celular: instale o app Gemini pela ', gemini_app_android: 'Google Play', gemini_app_o: ' (Android) ou pela ', gemini_app_ios: 'App Store', gemini_app_2: ' (iPhone) e entre com sua conta.',
    abrir_gemini: 'Abrir o Gemini', crear_cuenta: 'Criar conta do Google', otra_edicion: 'Este link é de outra oficina',
    dip_conseguida: 'conquistada', dip_pendiente: 'pendente', dip_resumen: '{medallas} de {total} medalhas · {misiones} de {total_misiones} missões', dip_jefe: 'chefe final superado',
    dip_imprimir: 'Imprimir ou salvar em PDF', dip_demo: 'Amostra com dados inventados', ver_diploma: 'Ver meu diploma'
  }
};

let actual = normalizar(leerLocal('taller_idioma') || ((navigator.language || '').startsWith('pt') ? 'pt-BR' : IDIOMA_DEFECTO));

export function normalizar(v) {
  v = String(v || '');
  if (v === 'pt' || /^pt[-_]/i.test(v)) return 'pt-BR';
  return D[v] ? v : IDIOMA_DEFECTO;
}

export function idiomaActual() { return actual; }

export function setIdioma(v, recordar = true) {
  actual = normalizar(v);
  document.documentElement.lang = actual === 'pt-BR' ? 'pt-BR' : 'es';
  if (recordar) guardarLocal('taller_idioma', actual);
}

export function t(clave, valores) {
  let s = (D[actual] && D[actual][clave]) ?? D[IDIOMA_DEFECTO][clave] ?? clave;
  if (typeof s !== 'string') return s;
  Object.entries(valores || {}).forEach(([k, v]) => { s = s.split(`{${k}}`).join(v); });
  return s;
}

setIdioma(actual, false);
