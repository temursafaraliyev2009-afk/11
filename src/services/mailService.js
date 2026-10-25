// src/services/mailService.js
/**
 * Savatchi Mail & Staff Invitation Service
 * 
 * Ushbu xizmat ro'yxatdan o'tgan foydalanuvchilar o'rtasidagi
 * xodimlik takliflari, xabarlar va pochta tizimini boshqaradi.
 */

export const MAIL_MESSAGES_KEY = 'savatchi_mail_messages';
export const EMPLOYEES_STORAGE_PREFIX = 'savatchi_employees_';

import { isAccountStoreOwner, updateUserRoleInSystem } from './accountService.js';

/**
 * Barcha xabarlarni saqlash joyidan olish
 */
export const getAllMailMessages = () => {
  try {
    const raw = localStorage.getItem(MAIL_MESSAGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading mail messages:', e);
  }
  return [];
};

/**
 * Xabarlar ro'yxatini saqlash
 */
export const saveMailMessages = (messages) => {
  try {
    localStorage.setItem(MAIL_MESSAGES_KEY, JSON.stringify(messages));
    window.dispatchEvent(new CustomEvent('savatchi_mail_updated', { detail: { messages } }));
  } catch (e) {
    console.error('Error saving mail messages:', e);
  }
};

/**
 * Muayyan foydalanuvchiga tegishli xabarlar/takliflarni olish.
 * Faqat ushbu foydalanuvchiga kelgan yoki yuborilgan xabarlarni ko'rsatadi.
 */
export const getUserMailMessages = (user) => {
  if (!user) return [];
  const messages = getAllMailMessages();

  const userEmail = (user.email || '').trim().toLowerCase();
  const userId = user.id || user.uid || user.sub;
  const userPhone = (user.phone || '').replace(/\D/g, '');

  return messages.filter((msg) => {
    // 1. To User mosligi
    const toEmail = (msg.toUser?.email || '').trim().toLowerCase();
    const toId = msg.toUser?.id || msg.toUser?.uid;
    const toPhone = (msg.toUser?.phone || '').replace(/\D/g, '');

    const isRecipient =
      (userEmail && toEmail && userEmail === toEmail) ||
      (userId && toId && userId === toId) ||
      (userPhone && toPhone && userPhone.length >= 7 && (userPhone === toPhone || userPhone.endsWith(toPhone) || toPhone.endsWith(userPhone)));

    // 2. From User mosligi (yuborilgan takliflar holatini ko'rish uchun)
    const fromEmail = (msg.fromUser?.email || '').trim().toLowerCase();
    const fromId = msg.fromUser?.id || msg.fromUser?.uid;
    const isSender = (userEmail && fromEmail && userEmail === fromEmail) || (userId && fromId && userId === fromId);

    return isRecipient || isSender;
  });
};

/**
 * Foydalanuvchining ko'rilmagan / kutilayotgan takliflari soni
 */
export const getPendingInvitationsCount = (user) => {
  if (!user) return 0;
  if (isAccountStoreOwner(user)) return 0;
  const messages = getUserMailMessages(user);
  const userEmail = (user.email || '').trim().toLowerCase();
  const userId = user.id || user.uid || user.sub;

  return messages.filter((msg) => {
    const toEmail = (msg.toUser?.email || '').trim().toLowerCase();
    const toId = msg.toUser?.id || msg.toUser?.uid;
    const isRecipient = (userEmail && toEmail && userEmail === toEmail) || (userId && toId && userId === toId);
    return isRecipient && msg.status === 'Kutilmoqda';
  }).length;
};

/**
 * Muayyan do'kondagi xodimlar ro'yxatini to'g'ridan-to'g'ri saqlash joyidan olish
 */
export const getStoreEmployeesFromStorage = (storeId) => {
  try {
    const raw = localStorage.getItem(EMPLOYEES_STORAGE_PREFIX + storeId);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

/**
 * Muayyan do'konga xodimlar ro'yxatini yozish
 */
export const saveStoreEmployeesToStorage = (storeId, employees) => {
  try {
    localStorage.setItem(EMPLOYEES_STORAGE_PREFIX + storeId, JSON.stringify(employees));
    window.dispatchEvent(
      new CustomEvent('savatchi_employees_storage_updated', {
        detail: { storeId, employees }
      })
    );
  } catch (e) {
    console.error('Error saving store employees:', e);
  }
};

/**
 * Admin tomonidan yangi xodimlik taklifini yuborish
 */
export const sendStaffInvitation = ({ storeId, storeName, storeType, fromUser, targetAccount, toAccount }) => {
  const target = targetAccount || toAccount;
  if (!storeId || !target) {
    throw new Error("Do'kon yoki akkaunt ma'lumotlari to'liq emas.");
  }

  const targetEmail = (target.email || '').trim().toLowerCase();
  const targetId = target.id || target.uid;

  // 0. Do'kon egasini xodimlikka taklif qilish qat'iyan taqiqlanadi (Qoida 3)
  if (isAccountStoreOwner(target)) {
    throw new Error("Ushbu foydalanuvchi allaqachon do‘kon egasi hisoblanadi va xodim sifatida taklif qilinishi mumkin emas!");
  }

  // O'zini o'zi taklif qilishni taqiqlash
  const senderEmail = (fromUser?.email || '').trim().toLowerCase();
  const senderId = fromUser?.id || fromUser?.uid;
  const isSamePerson = 
    (targetEmail && senderEmail && targetEmail === senderEmail) ||
    (targetId && senderId && targetId === senderId && (!targetEmail || !senderEmail || targetEmail === senderEmail));

  if (isSamePerson) {
    throw new Error("O‘zingizni xodim sifatida taklif qila olmaysiz!");
  }

  // 1. Akkaunt allaqachon shu do'konda xodim ekanligini tekshirish
  const currentEmployees = getStoreEmployeesFromStorage(storeId);
  const isAlreadyEmployee = currentEmployees.some((emp) => {
    const eEmail = (emp.email || '').trim().toLowerCase();
    if (targetEmail && eEmail && targetEmail === eEmail) return true;
    if (targetId && (emp.accountId === targetId || emp.userId === targetId)) return true;
    return false;
  });

  if (isAlreadyEmployee) {
    throw new Error("Bu akkaunt allaqachon ushbu do‘konda xodim bo‘lib ishlamoqda.");
  }

  // 2. Maksimal 7 xodim cheklovi tekshiruvi
  if (currentEmployees.length >= 7) {
    throw new Error("Do‘konda maksimal 7 ta xodim sig‘imi to‘lgan!");
  }

  const allMessages = getAllMailMessages();

  // 3. Allaqachon kutilayotgan taklif bor-yo'qligini tekshirish
  const pendingExists = allMessages.some((msg) => {
    if (msg.type !== 'staff_invitation' || msg.status !== 'Kutilmoqda' || msg.storeId !== storeId) {
      return false;
    }
    const toEmail = (msg.toUser?.email || '').trim().toLowerCase();
    const toId = msg.toUser?.id || msg.toUser?.uid;
    return (targetEmail && toEmail && targetEmail === toEmail) || (targetId && toId && targetId === toId);
  });

  if (pendingExists) {
    throw new Error("Ushbu foydalanuvchi allaqachon taklif yuborilgan va u tasdiqlashni kutmoqda.");
  }

  // 4. Yangi taklif yaratish
  const invitation = {
    id: 'inv-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    type: 'staff_invitation',
    storeId,
    storeName: storeName || 'Savatchi Do‘koni',
    storeType: storeType || 'food',
    fromUser: {
      id: fromUser?.id || fromUser?.uid || 'usr-admin',
      name: fromUser?.displayName || fromUser?.name || 'Do‘kon egasi',
      email: fromUser?.email || 'admin@savatchi.uz',
      photoURL: fromUser?.photoURL || null
    },
    toUser: {
      id: target.id || target.uid,
      name:
        target.displayName ||
        `${target.firstName || ''} ${target.lastName || ''}`.trim() ||
        target.email,
      email: target.email,
      phone: target.phone || '',
      photoURL: target.photoURL || null,
      avatar: target.avatar || 'X',
      bg: target.bg || 'bg-blue-600'
    },
    initialRole: 'Xodim',
    status: 'Kutilmoqda', // 'Kutilmoqda', 'Qabul qilindi', 'Rad etildi'
    createdAt: new Date().toISOString(),
    respondedAt: null
  };

  const updatedMessages = [invitation, ...allMessages];
  saveMailMessages(updatedMessages);

  // Agar ushbu akkaunt avval o'chirilganlar ro'yxatida bo'lsa, yangi taklif yuborilganda uni ro'yxatdan tozalaymiz
  try {
    const delKey = `savatchi_deleted_employees_${storeId}`;
    const rawDel = localStorage.getItem(delKey);
    if (rawDel) {
      let delList = JSON.parse(rawDel);
      if (Array.isArray(delList)) {
        delList = delList.filter(d =>
          !(targetEmail && d.email && d.email.toLowerCase() === targetEmail) &&
          !(targetId && (d.accountId === targetId || d.id === targetId))
        );
        localStorage.setItem(delKey, JSON.stringify(delList));
      }
    }
  } catch (e) {}

  return invitation;
};

/**
 * Xodimlik taklifini qabul qilish
 */
export const acceptStaffInvitation = (invitationId, currentUser) => {
  const allMessages = getAllMailMessages();
  const invitationIndex = allMessages.findIndex((m) => m.id === invitationId);

  if (invitationIndex < 0) {
    throw new Error("Taklif topilmadi.");
  }

  const invitation = allMessages[invitationIndex];

  if (invitation.status !== 'Kutilmoqda') {
    throw new Error(`Ushbu taklif allaqachon ko‘rib chiqilgan (Holati: ${invitation.status}).`);
  }

  // QOIDA 3: Do'kon egasi xodimlik taklifini qabul qila olmaydi
  const effectiveRecipient = currentUser || invitation.toUser;
  if (isAccountStoreOwner(effectiveRecipient)) {
    throw new Error("Sizda allaqachon do‘kon egasi roli mavjud. Do‘kon egasi xodimlik taklifini qabul qila olmaydi!");
  }

  // Taklif qabul qilinayotgan do'kon xodimlari
  const currentEmployees = getStoreEmployeesFromStorage(invitation.storeId);

  // Dublikat tekshiruvi
  const targetEmail = (invitation.toUser.email || '').trim().toLowerCase();
  const targetId = invitation.toUser.id;
  const alreadyInStore = currentEmployees.some((emp) => {
    const eEmail = (emp.email || '').trim().toLowerCase();
    if (targetEmail && eEmail && targetEmail === eEmail) return true;
    if (targetId && (emp.accountId === targetId || emp.userId === targetId)) return true;
    return false;
  });

  if (alreadyInStore) {
    // Taklif holatini qabul qilindiga yangilab qo'yamiz va qaytamiz
    allMessages[invitationIndex] = {
      ...invitation,
      status: 'Qabul qilindi',
      respondedAt: new Date().toISOString()
    };
    saveMailMessages(allMessages);
    throw new Error("Siz allaqachon ushbu do‘konga xodim sifatida qo‘shilgansiz.");
  }

  // Yangi xodim ob'ekti — Boshlang'ich roli AVTOMATIK "Xodim" bo'ladi!
  const newEmployee = {
    id: 'emp-' + Date.now(),
    accountId: invitation.toUser.id || currentUser?.id || currentUser?.uid,
    name: invitation.toUser.name || currentUser?.displayName || 'Xodim',
    email: invitation.toUser.email || currentUser?.email || '',
    phone: invitation.toUser.phone || currentUser?.phone || '+998 90 000 00 00',
    role: 'Xodim', // Qat'iy talab: boshlang'ich rol avtomatik "Xodim" bo'ladi
    status: 'Faol',
    avatar:
      invitation.toUser.avatar ||
      (invitation.toUser.name ? invitation.toUser.name.charAt(0).toUpperCase() : 'X'),
    photoURL: invitation.toUser.photoURL || currentUser?.photoURL || null,
    bg: invitation.toUser.bg || 'bg-blue-600',
    lastActivity: 'Hozir faol',
    storeId: invitation.storeId,
    joinedAt: new Date().toISOString()
  };

  // Do'kon xodimlari ro'yxatiga qo'shish
  const updatedEmployees = [...currentEmployees, newEmployee];
  saveStoreEmployeesToStorage(invitation.storeId, updatedEmployees);

  // QOIDA 2: Rollar va do‘kon a’zoligini yangilash
  // 1. Taklifni qabul qilgan foydalanuvchiga "Xodim" roli beriladi
  const recipientId = invitation.toUser?.id || currentUser?.id || currentUser?.uid;
  const recipientEmail = invitation.toUser?.email || currentUser?.email;
  if (recipientId) updateUserRoleInSystem(recipientId, 'Xodim');
  if (recipientEmail && recipientEmail !== recipientId) updateUserRoleInSystem(recipientEmail, 'Xodim');

  // 2. Taklif yuborgan foydalanuvchiga "Do'kon egasi" roli beriladi
  const senderId = invitation.fromUser?.id || invitation.fromUser?.uid;
  const senderEmail = invitation.fromUser?.email;
  if (senderId) updateUserRoleInSystem(senderId, "Do'kon egasi");
  if (senderEmail && senderEmail !== senderId) updateUserRoleInSystem(senderEmail, "Do'kon egasi");

  // Taklif holatini "Qabul qilindi" ga o'zgartirish
  allMessages[invitationIndex] = {
    ...invitation,
    status: 'Qabul qilindi',
    respondedAt: new Date().toISOString()
  };

  // Do'kon adminiga bildirishnoma xabari yuborish
  const adminNotification = {
    id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    type: 'system_notification',
    storeId: invitation.storeId,
    storeName: invitation.storeName,
    storeType: invitation.storeType,
    fromUser: invitation.toUser,
    toUser: invitation.fromUser,
    title: 'Xodimlik taklifi qabul qilindi',
    message: `${invitation.toUser.name} sizning "${invitation.storeName}" do‘koningizga yuborgan xodimlik taklifingizni qabul qildi. Tizim tomonidan unga avtomatik ravishda "Xodim" roli biriktirildi.`,
    status: 'O‘qildi',
    createdAt: new Date().toISOString()
  };

  const finalMessages = [adminNotification, ...allMessages];
  saveMailMessages(finalMessages);

  // Hodisa signali
  window.dispatchEvent(
    new CustomEvent('savatchi_invitation_accepted', {
      detail: { invitation, newEmployee, storeId: invitation.storeId }
    })
  );

  return { invitation: allMessages[invitationIndex], newEmployee };
};

/**
 * Xodimlik taklifini rad etish
 */
export const rejectStaffInvitation = (invitationId, currentUser) => {
  const allMessages = getAllMailMessages();
  const invitationIndex = allMessages.findIndex((m) => m.id === invitationId);

  if (invitationIndex < 0) {
    throw new Error("Taklif topilmadi.");
  }

  const invitation = allMessages[invitationIndex];

  if (invitation.status !== 'Kutilmoqda') {
    throw new Error(`Ushbu taklif allaqachon ko‘rib chiqilgan (Holati: ${invitation.status}).`);
  }

  // Taklif holatini "Rad etildi" ga o'zgartirish
  allMessages[invitationIndex] = {
    ...invitation,
    status: 'Rad etildi',
    respondedAt: new Date().toISOString()
  };

  // Do'kon adminiga bildirishnoma yuborish
  const adminNotification = {
    id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    type: 'system_notification',
    storeId: invitation.storeId,
    storeName: invitation.storeName,
    storeType: invitation.storeType,
    fromUser: invitation.toUser,
    toUser: invitation.fromUser,
    title: 'Xodimlik taklifi rad etildi',
    message: `${invitation.toUser.name} sizning "${invitation.storeName}" do‘koningizga yuborgan xodimlik taklifingizni rad etdi.`,
    status: 'O‘qildi',
    createdAt: new Date().toISOString()
  };

  const finalMessages = [adminNotification, ...allMessages];
  saveMailMessages(finalMessages);

  // Hodisa signali
  window.dispatchEvent(
    new CustomEvent('savatchi_invitation_rejected', {
      detail: { invitation, storeId: invitation.storeId }
    })
  );

  return allMessages[invitationIndex];
};

/**
 * Admin tomonidan xodimning rolini o'zgartirish va saqlash
 */
export const updateEmployeeRoleInStorage = (storeId, employeeId, newRole) => {
  if (!storeId || !employeeId) {
    throw new Error("Do'kon yoki xodim identifikatori ko'rsatilmadi.");
  }

  const roleText = (newRole || '').trim();
  if (!roleText) {
    throw new Error("Rol nomi bo‘sh bo‘lishi mumkin emas!");
  }

  const employees = getStoreEmployeesFromStorage(storeId);
  const empIndex = employees.findIndex((e) => e.id === employeeId);

  if (empIndex < 0) {
    throw new Error("Xodim topilmadi.");
  }

  employees[empIndex] = {
    ...employees[empIndex],
    role: roleText,
    updatedAt: new Date().toISOString()
  };

  saveStoreEmployeesToStorage(storeId, employees);

  window.dispatchEvent(
    new CustomEvent('savatchi_employee_role_updated', {
      detail: { storeId, employeeId, newRole: roleText }
    })
  );

  return employees[empIndex];
};

/**
 * Xodim o'chirilganda unga tegishli barcha takliflarni nofaol (O‘chirilgan) holatga o'tkazish
 */
export const deactivateStoreEmployeeInvitations = (storeId, emp) => {
  if (!storeId || !emp) return;
  const allMessages = getAllMailMessages();
  const empEmail = (emp.email || '').trim().toLowerCase();
  const empId = emp.accountId || emp.userId || emp.id;

  let changed = false;
  const updated = allMessages.map(m => {
    if (m.type === 'staff_invitation' && m.storeId === storeId) {
      const toEmail = (m.toUser?.email || '').trim().toLowerCase();
      const toId = m.toUser?.id || m.toUser?.uid;
      const isMatch = (empEmail && toEmail && empEmail === toEmail) || (empId && toId && String(empId) === String(toId));
      if (isMatch) {
        changed = true;
        return {
          ...m,
          status: 'O‘chirilgan',
          deletedAt: new Date().toISOString()
        };
      }
    }
    return m;
  });

  if (changed) {
    saveMailMessages(updated);
  }
};

/**
 * Do'kon xodimlari ro'yxatini qabul qilingan takliflar bilan xavfsiz sinxronlashtirish.
 * Bu ma'lumotlar yo'qolishining oldini oladi va faqat haqiqiy qabul qilingan xodimlarni yuklaydi.
 * O'chirilgan xodimlar qayta paydo bo'lishining oldi olinadi.
 */
export const syncStoreEmployeesWithAcceptedInvitations = (storeId) => {
  if (!storeId) return [];
  const existingEmployees = getStoreEmployeesFromStorage(storeId);
  const allMessages = getAllMailMessages();

  // O'chirilgan xodimlar ro'yxatini tekshirish
  let deletedList = [];
  try {
    const rawDel = localStorage.getItem(`savatchi_deleted_employees_${storeId}`);
    if (rawDel) {
      const parsed = JSON.parse(rawDel);
      if (Array.isArray(parsed)) deletedList = parsed;
    }
  } catch (e) {}

  const acceptedInvites = allMessages.filter(
    (m) => m.type === 'staff_invitation' && m.storeId === storeId && m.status === 'Qabul qilindi'
  );

  let updated = false;
  const merged = [...existingEmployees];

  acceptedInvites.forEach((inv) => {
    const toEmail = (inv.toUser?.email || '').trim().toLowerCase();
    const toId = inv.toUser?.id || inv.toUser?.uid;

    // Agar ushbu xodim ilgari o'chirilgan bo'lsa, uni aslo qayta qo'shmaymiz
    const isDeleted = deletedList.some(d =>
      (toEmail && d.email && d.email.toLowerCase() === toEmail) ||
      (toId && (d.accountId === toId || d.id === toId))
    );
    if (isDeleted) return;

    const exists = merged.some((emp) => {
      const eEmail = (emp.email || '').trim().toLowerCase();
      if (toEmail && eEmail && toEmail === eEmail) return true;
      if (toId && (emp.accountId === toId || emp.userId === toId || emp.id === toId)) return true;
      return false;
    });

    if (!exists) {
      merged.push({
        id: 'emp-' + (inv.respondedAt ? new Date(inv.respondedAt).getTime() : Date.now()),
        accountId: toId,
        name: inv.toUser?.name || 'Xodim',
        email: inv.toUser?.email || '',
        phone: inv.toUser?.phone || '+998 90 000 00 00',
        role: inv.initialRole || 'Xodim',
        status: 'Faol',
        avatar: inv.toUser?.avatar || (inv.toUser?.name ? inv.toUser.name.charAt(0).toUpperCase() : 'X'),
        photoURL: inv.toUser?.photoURL || null,
        bg: inv.toUser?.bg || 'bg-blue-600',
        lastActivity: 'Hozir faol',
        storeId: storeId,
        joinedAt: inv.respondedAt || inv.createdAt || new Date().toISOString()
      });
      updated = true;
    }
  });

  if (updated) {
    saveStoreEmployeesToStorage(storeId, merged);
  }
  return merged;
};
