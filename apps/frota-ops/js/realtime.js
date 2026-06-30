import { supabase, TENANT_ID } from './supabase.js';
import { logger } from './utils.js';

let _channels = [];

function setRealtimeDot(active) {
  const dot = document.getElementById('realtime-dot');
  if (!dot) return;
  if (active) {
    dot.classList.add('active');
    clearTimeout(dot._timeout);
    dot._timeout = setTimeout(() => dot.classList.remove('active'), 3000);
  } else {
    dot.classList.remove('active');
  }
}

export function subscribeVeiculos(callback) {
  const channel = supabase
    .channel('frota_veiculos_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'frota_veiculos',
        filter: `tenant_id=eq.${TENANT_ID}`
      },
      (payload) => {
        logger.info('Realtime veiculos:', payload.eventType);
        setRealtimeDot(true);
        callback(payload);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setRealtimeDot(true);
        logger.info('Subscribed to frota_veiculos');
      }
    });

  _channels.push(channel);
  return channel;
}

export function subscribeReservas(callback) {
  const channel = supabase
    .channel('frota_reservas_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'frota_reservas',
        filter: `tenant_id=eq.${TENANT_ID}`
      },
      (payload) => {
        logger.info('Realtime reservas:', payload.eventType);
        setRealtimeDot(true);
        callback(payload);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Subscribed to frota_reservas');
      }
    });

  _channels.push(channel);
  return channel;
}

export function unsubscribe(channel) {
  if (!channel) return;
  supabase.removeChannel(channel);
  _channels = _channels.filter((c) => c !== channel);
}

export function unsubscribeAll() {
  _channels.forEach((ch) => supabase.removeChannel(ch));
  _channels = [];
}
