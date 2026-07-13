'use strict';

const { prisma }   = require('../config/database');
const { success }  = require('../utils/response');
const { AppError } = require('../middleware/errorHandler');
const aiService    = require('../services/ai.service');

/* ══════════════════════════════════════
   CHAT WITH ECOBOT
══════════════════════════════════════ */
exports.chat = async (req, res) => {
  const { message, conversationId } = req.body;
  if (!message?.trim()) throw new AppError('Message is required', 400);

  /* Load conversation history */
  let history = [];
  let conversation = null;

  if (conversationId) {
    conversation = await prisma.aIConversation.findUnique({
      where:   { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } }
    });
    if (conversation) {
      history = conversation.messages.map(m => ({
        role:    m.role === 'USER' ? 'user' : 'assistant',
        content: m.content
      }));
    }
  }

  /* Get response from AI */
  const { reply, tokens, model } = await aiService.ecobotQuery(
    req.user.id,
    req.user.orgId,
    message,
    history
  );

  /* Save conversation */
  let savedConvId = conversationId;
  try {
    if (!conversation) {
      const newConv = await prisma.aIConversation.create({
        data: {
          userId:         req.user.id,
          organizationId: req.user.orgId || null,
          title:          message.slice(0, 60)
        }
      });
      savedConvId = newConv.id;
    }

    await prisma.aIMessage.createMany({
      data: [
        { conversationId: savedConvId, role: 'USER',      content: message },
        { conversationId: savedConvId, role: 'ASSISTANT', content: reply,  tokensUsed: tokens, model }
      ]
    });
  } catch (err) {
    /* Non-blocking — still return reply */
  }

  return success(res, { reply, conversationId: savedConvId, model });
};

/* ══════════════════════════════════════
   GET CONVERSATION HISTORY
══════════════════════════════════════ */
exports.getConversations = async (req, res) => {
  const conversations = await prisma.aIConversation.findMany({
    where:   { userId: req.user.id },
    orderBy: { updatedAt: 'desc' },
    take:    20,
    select:  { id: true, title: true, updatedAt: true, _count: { select: { messages: true } } }
  });
  return success(res, { conversations });
};

/* ══════════════════════════════════════
   GET SINGLE CONVERSATION
══════════════════════════════════════ */
exports.getConversation = async (req, res) => {
  const conversation = await prisma.aIConversation.findUnique({
    where:   { id: req.params.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });
  if (!conversation) throw new AppError('Conversation not found', 404);
  if (conversation.userId !== req.user.id) throw new AppError('Access denied', 403);
  return success(res, { conversation });
};

/* ══════════════════════════════════════
   DELETE CONVERSATION
══════════════════════════════════════ */
exports.deleteConversation = async (req, res) => {
  const conversation = await prisma.aIConversation.findUnique({ where: { id: req.params.id } });
  if (!conversation) throw new AppError('Conversation not found', 404);
  if (conversation.userId !== req.user.id) throw new AppError('Access denied', 403);

  await prisma.aIConversation.delete({ where: { id: req.params.id } });
  return success(res, {}, 'Conversation deleted');
};

/* ══════════════════════════════════════
   AI RECOMMENDATIONS FOR ORG
══════════════════════════════════════ */
exports.getRecommendations = async (req, res) => {
  const orgId = req.user.orgId;
  if (!orgId) throw new AppError('Organization context required', 400);

  const recommendations = await prisma.aIRecommendation.findMany({
    where:   { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    take:    10
  });
  return success(res, { recommendations });
};
