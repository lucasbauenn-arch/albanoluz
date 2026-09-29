# Build estático + nginx (EasyPanel / qualquer VPS com Docker)
FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_TURNSTILE_SITE_KEY
ARG VITE_GA4_ID
ARG VITE_META_PIXEL_ID
# Saída de emergência do pré-render: "1" gera o site mesmo sem nenhuma obra
# publicada no Supabase (veja a seção Deploy do README). Deixe vazia no dia a dia.
ARG PERMITIR_PORTFOLIO_VAZIO
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY \
    VITE_GA4_ID=$VITE_GA4_ID \
    VITE_META_PIXEL_ID=$VITE_META_PIXEL_ID \
    PERMITIR_PORTFOLIO_VAZIO=$PERMITIR_PORTFOLIO_VAZIO

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
