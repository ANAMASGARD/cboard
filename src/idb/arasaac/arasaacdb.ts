import { DBSchema, StoreNames } from 'idb';
import { openDB } from 'idb/with-async-ittr.js';

// TODO: better name
export interface Image {
  id: string;
  type: string;
  data: ArrayBuffer;
}

// TODO: better name
export interface Text {
  imageId: string;
  keywords: string[];
}

interface ArasaacDB extends DBSchema {
  text: {
    key: string;
    value: Text;
    indexes: {
      by_keyword: string;
    };
  };
  images: {
    key: string;
    value: Image;
  };
  keywords: {
    key: string;
    value: {langCode: string, data: Text[]};
  }
}

type DBStoreName = StoreNames<ArasaacDB>;

const DB_NAME = 'arasaac';
const DB_VERSION = 1;

const dbPromise = openDB<ArasaacDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore('images', { keyPath: 'id' });
    db.createObjectStore('keywords', { keyPath: 'langCode' });

    const textStore = db.createObjectStore('text', { keyPath: 'imageId' });
    textStore.createIndex('by_keyword', 'keywords', { multiEntry: true });
  }
});

async function getAllImages() {
  const db = await dbPromise;
  return db.getAll('images');
}

async function getImageById(id: string) {
  const db = await dbPromise;
  return db.get('images', id);
}

async function addImage(symbol: Image) {
  const db = await dbPromise;
  return db.add('images', symbol);
}

async function addText(langCode: string, text: Text) {
  const db = await dbPromise;
  return db.add('text', text, langCode);
}

async function addKeyword(langCode: string, keywords: Text[]) {
  const db = await dbPromise;
  return db.add('keywords', { langCode, data: keywords });
}

async function getImagesByKeyword(keyword: string) {
  const db = await dbPromise;
  const textByKeyword = keyword ? await db.getAllFromIndex('text', 'by_keyword', keyword.toLowerCase()) : [];
  const imagesIds = textByKeyword.map(str => str.imageId?.toString()).filter(Boolean);
  
  const images = await Promise.all(
    imagesIds.map(async (id) => {
      const image = await db.get('images', id);
      const text = await db.get('text', id);
      
      if (image) {
        const blob = new Blob([image.data], { type: image.type })
        return {blob, id: image.id, label: text?.keywords.find((kw)=>kw.includes(keyword))}
      } 

      return null
    })
  );

  return images.filter(Boolean);
}

async function getTextByLangCode(langCode: string) {
  const db = await dbPromise;
  return db.get('text', langCode);
}

async function importContent({
  symbols,
  data
}: {
  symbols?: { id: string; type: string; data: ArrayBuffer }[];
  data?: { id: string; data: { id: string; kw: string[] }[] }[];
}) {
  const db = await dbPromise;
  const tx = db.transaction(['images', 'text', 'keywords'], 'readwrite');

  const symbolsStore = await tx.objectStore('images');
  const keywordsStore = await tx.objectStore('keywords');

  if (symbols) {
    symbols.forEach((symbol: Image) => {
      symbolsStore.add(symbol);
    });
  }

  if (data) {
    data.forEach(strings => {
      const mappedData =strings.data.map(({id, kw})=>({imageId: id.toString(), keywords: kw}))
      keywordsStore.add({ langCode: strings.id, data: mappedData });
    });
  }

  await tx.done;
  console.log('Imported content');
}

async function initTextStore(lang: string) {
  console.log('initTextStore(): started');

  const db = await dbPromise;
  const tx = db.transaction(['text', 'keywords'], 'readwrite');

  const keywordsStore = await tx.objectStore('keywords');
  const textStore = await tx.objectStore('text');
  
  const text = await keywordsStore.get(lang);
  if (text) {
    text.data.forEach((data)=>{
      const keywords = data.keywords.map((keyword)=>[keyword, ...keyword.split(' ')]).flat();
      textStore.put({...data, keywords: keywords});
    })  
  } else {
    const defaultLang = 'en';
    const defaultText = await keywordsStore.get(defaultLang);
    
    if (defaultText) {
     defaultText.data.forEach((data)=>{
       textStore.put(data);
     })  
    }
  }
  
  await tx.done;
  console.log('initTextStore(): completed');
}
async function getImagesText(text: string) {
  const db = await dbPromise;
  const tx = db.transaction(['text', 'images'], 'readonly');
  const imageStore = await tx.objectStore('images');
  let cursor = await tx.objectStore('text').index('by_keyword').openCursor();
const result = [];
  while (cursor) {
   
const includesText = cursor.value.keywords.includes(text)

    if (includesText) {
      const image = await imageStore.get(cursor.value.imageId.toString());
      const blob = image ? new Blob([image.data], { type: image.type }) : null
if (blob) {
  result.push({blob, id: cursor.value.imageId, keywords: cursor.value.keywords});

}
    }
    cursor = await cursor.continue();
  }
return result
}


const arasaacDB = {
  addImage,
  addText,
  getAllImages,
  getTextByLangCode,
  getImageById,
  getImagesByKeyword,
  importContent,
  addKeyword,
  initTextStore,
  getImagesText
};

export const getArasaacDB = () => arasaacDB;
