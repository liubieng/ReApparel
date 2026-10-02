export interface LocationInfo {
  country: string;
  province: string;
  city: string;
  latitude: number;
  longitude: number;
}

export const REGIONS = [
  'Central Visayas',
  'National Capital Region (NCR)',
  'Western Visayas',
  'Davao Region',
  'Ilocos Region'
];

export const BARANGAYS_BY_REGION: Record<string, string[]> = {
  'Central Visayas': [
    'Daro',
    'Bantayan',
    'Tinago',
    'Tubod',
    'Piapi',
    'Mangnao',
    'Looc'
  ],
  'National Capital Region (NCR)': [
    'Bel-Air',
    'Poblacion',
    'San Lorenzo',
    'San Antonio'
  ],
  'Western Visayas': [
    'Mandurriao',
    'Jaro',
    'Molo'
  ],
  'Davao Region': [
    'Poblacion',
    'Buhangin',
    'Talomo'
  ],
  'Ilocos Region': [
    'Poblacion',
    'San Pedro',
    'San Fernando'
  ]
};

export const COUNTRIES = [
  'Philippines',
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Japan',
  'Other'
];

export const PROVINCES_BY_COUNTRY: Record<string, string[]> = {
  'Philippines': [
    'Abra',
    'Agusan del Norte',
    'Agusan del Sur',
    'Aklan',
    'Albay',
    'Antique',
    'Apayao',
    'Aurora',
    'Basilan',
    'Bataan',
    'Batanes',
    'Batangas',
    'Benguet',
    'Biliran',
    'Bohol',
    'Bukidnon',
    'Bulacan',
    'Cagayan',
    'Camarines Norte',
    'Camarines Sur',
    'Camiguin',
    'Capiz',
    'Catanduanes',
    'Cavite',
    'Cebu',
    'Cotabato',
    'Davao de Oro',
    'Davao del Norte',
    'Davao del Sur',
    'Davao Occidental',
    'Davao Oriental',
    'Dinagat Islands',
    'Eastern Samar',
    'Guimaras',
    'Ifugao',
    'Ilocos Norte',
    'Ilocos Sur',
    'Iloilo',
    'Isabela',
    'Kalinga',
    'La Union',
    'Laguna',
    'Lanao del Norte',
    'Lanao del Sur',
    'Leyte',
    'Maguindanao del Norte',
    'Maguindanao del Sur',
    'Marinduque',
    'Masbate',
    'Metro Manila',
    'Misamis Occidental',
    'Misamis Oriental',
    'Mountain Province',
    'Negros Occidental',
    'Negros Oriental',
    'Northern Samar',
    'Nueva Ecija',
    'Nueva Vizcaya',
    'Occidental Mindoro',
    'Oriental Mindoro',
    'Palawan',
    'Pampanga',
    'Pangasinan',
    'Quezon',
    'Quirino',
    'Rizal',
    'Romblon',
    'Samar',
    'Sarangani',
    'Siquijor',
    'Sorsogon',
    'South Cotabato',
    'Southern Leyte',
    'Sultan Kudarat',
    'Sulu',
    'Surigao del Norte',
    'Surigao del Sur',
    'Tarlac',
    'Tawi-Tawi',
    'Zambales',
    'Zamboanga del Norte',
    'Zamboanga del Sur',
    'Zamboanga Sibugay'
  ],
  'United States': [
    'California',
    'New York',
    'Texas',
    'Washington',
    'Illinois',
    'Florida',
    'Massachusetts',
    'Oregon'
  ],
  'Canada': [
    'Ontario',
    'British Columbia',
    'Quebec',
    'Alberta'
  ],
  'United Kingdom': [
    'Greater London',
    'Greater Manchester',
    'West Midlands',
    'Scotland'
  ],
  'Australia': [
    'New South Wales',
    'Victoria',
    'Queensland'
  ],
  'Japan': [
    'Tokyo',
    'Osaka',
    'Kyoto'
  ],
  'Other': [
    'General Region'
  ]
};

export const CITIES_BY_PROVINCE: Record<string, string[]> = {
  // Philippines - All 82 Provinces + Metro Manila
  'Abra': ['Bangued', 'Bucay', 'Dolores', 'La Paz', 'Tayum', 'Manabo'],
  'Agusan del Norte': ['Butuan City', 'Cabadbaran City', 'Buenavista', 'Carmen', 'Nasipit', 'Tubay'],
  'Agusan del Sur': ['Bayugan City', 'Prosperidad', 'San Francisco', 'Trento', 'Esperanza', 'Bunawan'],
  'Aklan': ['Kalibo', 'Malay (Boracay)', 'Numancia', 'Banga', 'Ibajay', 'New Washington'],
  'Albay': ['Legazpi City', 'Ligao City', 'Tabaco City', 'Daraga', 'Camalig', 'Guinobatan', 'Polangui'],
  'Antique': ['San Jose de Buenavista', 'Sibalom', 'Hamtic', 'Culasi', 'Tibiao', 'Pandan'],
  'Apayao': ['Kabugao', 'Luna', 'Conner', 'Flora', 'Pudtol', 'Santa Marcela'],
  'Aurora': ['Baler', 'Casiguran', 'Dipaculao', 'Maria Aurora', 'Dingalan', 'San Luis'],
  'Basilan': ['Isabela City', 'Lamitan City', 'Maluso', 'Tuburan', 'Sumisip', 'Tipo-Tipo'],
  'Bataan': ['Balanga City', 'Mariveles', 'Dinalupihan', 'Orani', 'Hermosa', 'Limay', 'Subic Bay Freeport Zone'],
  'Batanes': ['Basco', 'Itbayat', 'Ivana', 'Mahatao', 'Sabtang', 'Uyugan'],
  'Batangas': ['Batangas City', 'Lipa City', 'Tanauan City', 'Santo Tomas', 'Nasugbu', 'Bauuan', 'Calaca City', 'Balayan', 'Lemery'],
  'Benguet': ['Baguio City', 'La Trinidad', 'Itogon', 'Tuba', 'Tublay', 'Mankayan'],
  'Biliran': ['Naval', 'Almeria', 'Biliran', 'Cabucgayan', 'Caibiran', 'Kawayan', 'Culaba'],
  'Bohol': ['Tagbilaran City', 'Panglao', 'Carmen', 'Tubigon', 'Talibon', 'Jagna', 'Loon', 'Anda', 'Dauis'],
  'Bukidnon': ['Malaybalay City', 'Valencia City', 'Manolo Fortich', 'Maramag', 'Quezon', 'Don Carlos'],
  'Bulacan': ['Malolos City', 'Meycauayan City', 'San Jose del Monte City', 'Marilao', 'Santa Maria', 'Baliuag City', 'Bocaue', 'Plaridel'],
  'Cagayan': ['Tuguegarao City', 'Aparri', 'Baggao', 'Lal-lo', 'Solana', 'Gonzaga', 'Santa Ana'],
  'Camarines Norte': ['Daet', 'Labo', 'Jose Panganiban', 'Mercedes', 'Basud', 'Vinzons'],
  'Camarines Sur': ['Naga City', 'Iriga City', 'Pili', 'Calabanga', 'Libmanan', 'Goa', 'Caramoan'],
  'Camiguin': ['Mambajao', 'Catarman', 'Guinsiliban', 'Mahinog', 'Sagay'],
  'Capiz': ['Roxas City', 'Panay', 'Pontevedra', 'Dumalag', 'Mambusao', 'Tapaz'],
  'Catanduanes': ['Virac', 'San Andres', 'Bato', 'Caramoran', 'Pandan', 'Baras'],
  'Cavite': ['Tagaytay City', 'Bacoor City', 'Imus', 'Imus City', 'Dasmariñas City', 'General Trias City', 'Silang', 'Kawit', 'Carmona City', 'Trece Martires City'],
  'Cebu': ['Cebu City', 'Mandaue City', 'Lapu-Lapu City', 'Talisay City', 'Toledo City', 'Danao City', 'Carcar City', 'Naga City', 'Bogo City', 'Minglanilla', 'Consolacion', 'Liloan'],
  'Cotabato': ['Kidapawan City', 'Midsayap', 'Pikit', 'Kabacan', 'Carmen', 'Makilala', 'Matalam'],
  'Davao de Oro': ['Nabunturan', 'Monkayo', 'Compostela', 'Pantukan', 'Mawab', 'Maragusan'],
  'Davao del Norte': ['Tagum City', 'Panabo City', 'Island Garden City of Samal', 'Carmen', 'Sto. Tomas', 'Kapalong'],
  'Davao del Sur': ['Davao City', 'Digos City', 'Santa Cruz', 'Bansalan', 'Matanao', 'Hagonoy'],
  'Davao Occidental': ['Malita', 'Santa Maria', 'Don Marcelino', 'Jose Abad Santos', 'Sarangani'],
  'Davao Oriental': ['Mati City', 'Lupon', 'Baganga', 'Gov. Generoso', 'Cateel', 'Caraga'],
  'Dinagat Islands': ['San Jose', 'Basilisa', 'Cagdianao', 'Dinagat', 'Libjo', 'Tubajon'],
  'Eastern Samar': ['Borongan City', 'Guiuan', 'Dolores', 'Oras', 'Balangiga', 'Can-avid'],
  'Guimaras': ['Jordan', 'Buenavista', 'Nueva Valencia', 'San Lorenzo', 'Sibunag'],
  'Ifugao': ['Lagawe', 'Banaue', 'Kiangan', 'Alfonso Lista', 'Mayoyao', 'Aguinaldo'],
  'Ilocos Norte': ['Laoag City', 'Batac City', 'Pagudpud', 'San Nicolas', 'Dingras', 'Paoay'],
  'Ilocos Sur': ['Vigan City', 'Candon City', 'Narvacan', 'Tagudin', 'Cabugao', 'Santa Maria'],
  'Iloilo': ['Iloilo City', 'Passi City', 'Oton', 'Pavia', 'Santa Barbara', 'Pototan', 'Dumangas', 'Guimbal', 'Estancia'],
  'Isabela': ['Ilagan City', 'Santiago City', 'Cauayan City', 'Echague', 'Roxas', 'Tumauini', 'Alicia'],
  'Kalinga': ['Tabuk City', 'Pinukpuk', 'Tinglayan', 'Rizal', 'Lubuagan', 'Pasil'],
  'La Union': ['San Fernando City', 'Agoo', 'Bauang', 'San Juan', 'Nagulian', 'Aringay'],
  'Laguna': ['Santa Rosa', 'Santa Rosa City', 'Calamba', 'Calamba City', 'San Pedro', 'San Pedro City', 'Biñan City', 'Cabuyao City', 'San Pablo City', 'Los Baños', 'Pagsanjan'],
  'Lanao del Norte': ['Iligan City', 'Tubod', 'Kapatagan', 'Lala', 'Baroy', 'Kolambugan'],
  'Lanao del Sur': ['Marawi City', 'Wao', 'Malabang', 'Balabagan', 'Tubaran', 'Ramain'],
  'Leyte': ['Tacloban City', 'Ormoc City', 'Baybay City', 'Palo', 'Tanauan', 'Carigara', 'Abuyog'],
  'Maguindanao del Norte': ['Datu Odin Sinsuat', 'Parang', 'Sultan Kudarat', 'Upi', 'Matanog', 'Kabuntalan'],
  'Maguindanao del Sur': ['Buluan', 'Datu Paglas', 'Shariff Aguak', 'Paglat', 'Ampatuan', 'Datu Piang'],
  'Marinduque': ['Boac', 'Santa Cruz', 'Gasan', 'Mogpog', 'Torrijos', 'Buenavista'],
  'Masbate': ['Masbate City', 'Aroroy', 'Milagros', 'Cawayan', 'Placer', 'Dimasalang'],
  'Metro Manila': ['Manila', 'Quezon City', 'Makati', 'Taguig (BGC)', 'Pasig', 'Mandaluyong', 'Caloocan', 'Parañaque', 'Pasay', 'Las Piñas', 'Marikina', 'Muntinlupa', 'Valenzuela', 'Malabon', 'Navotas', 'San Juan', 'Pateros'],
  'Misamis Occidental': ['Oroquieta City', 'Ozamiz City', 'Tangub City', 'Jimenez', 'Plaridel', 'Clarin'],
  'Misamis Oriental': ['Cagayan de Oro City', 'Gingoog City', 'El Salvador City', 'Tagoloan', 'Opol', 'Villanueva', 'Balingasag'],
  'Mountain Province': ['Bontoc', 'Sagada', 'Bauko', 'Besao', 'Tadian', 'Natonin'],
  'Negros Occidental': ['Bacolod City', 'Talisay City', 'Silay City', 'Bago City', 'Cadiz City', 'Sagay City', 'San Carlos City', 'Kabankalan City', 'Himamaylan City', 'Victorias City', 'La Carlota City', 'Sipalay City'],
  'Negros Oriental': ['Dumaguete City', 'Bais City', 'Tanjay City', 'Bayawan City', 'Canlaon City', 'Guihulngan City', 'Sibulan', 'Valencia', 'Bacong', 'Dauin', 'Zamboanguita', 'Siaton', 'Amlan', 'San Jose', 'Mabinay', 'Manjuyod', 'Bindoy', 'Ayungon', 'Tayasan', 'Jimalalud', 'La Libertad', 'Vallehermoso', 'Basay', 'Santa Catalina', 'Pamplona'],
  'Northern Samar': ['Catarman', 'Laoang', 'Allen', 'Palapag', 'San Roque', 'Mondragon'],
  'Nueva Ecija': ['Cabanatuan City', 'Palayan City', 'Gapan City', 'San Jose City', 'Science City of Muñoz', 'Talavera', 'Guimba', 'San Leonardo'],
  'Nueva Vizcaya': ['Bayombong', 'Solano', 'Bambang', 'Bagabag', 'Aritao', 'Dupax del Norte'],
  'Occidental Mindoro': ['San Jose', 'Mamburao', 'Sablayan', 'Calintaan', 'Santa Cruz', 'Abra de Ilog'],
  'Oriental Mindoro': ['Calapan City', 'Puerto Galera', 'Naujan', 'Pinamalayan', 'Roxas', 'Victoria', 'Bongabong'],
  'Palawan': ['Puerto Princesa City', 'El Nido', 'Coron', 'San Vicente', 'Brooke\'s Point', 'Roxas', 'Taytay', 'Narra'],
  'Pampanga': ['San Fernando', 'San Fernando City', 'Angeles City', 'Mabalacat City', 'Guagua', 'Lubao', 'Mexico', 'Arayat', 'Floridablanca'],
  'Pangasinan': ['Lingayen', 'Dagupan City', 'San Carlos City', 'Urdaneta City', 'Alaminos City', 'Rosales', 'Malasiqui', 'Mangaldan'],
  'Quezon': ['Lucena City', 'Tayabas City', 'Candelaria', 'Sariaya', 'Tiaong', 'Pagbilao', 'Infanta', 'Lucban', 'Gumaca'],
  'Quirino': ['Cabarroguis', 'Diffun', 'Maddela', 'Saguday', 'Aglipay', 'Nagtipunan'],
  'Rizal': ['Antipolo City', 'Taytay', 'Cainta', 'San Mateo', 'Rodriguez (Montalban)', 'Angono', 'Binangonan', 'Tanay', 'Morong'],
  'Romblon': ['Romblon', 'Odiongan', 'San Agustin', 'Looc', 'Cajidiocan', 'Alcantara', 'Santa Maria'],
  'Samar': ['Catbalogan City', 'Calbayog City', 'Basey', 'Gandara', 'Wright (Paranas)', 'Santa Margarita'],
  'Sarangani': ['Alabel', 'Glan', 'Kiamba', 'Maasim', 'Malapatan', 'Maitum', 'Malungon'],
  'Siquijor': ['Siquijor', 'Larena', 'Lazi', 'San Juan', 'Maria', 'Enrique Villanueva'],
  'Sorsogon': ['Sorsogon City', 'Gubat', 'Bulan', 'Irosin', 'Pilar', 'Castilla', 'Donsol'],
  'South Cotabato': ['General Santos City', 'Koronadal City', 'Polomolok', 'Surallah', 'Tupi', 'Banga', 'T\'Boli'],
  'Southern Leyte': ['Maasin City', 'Sogod', 'Macrohon', 'Bontoc', 'Hinunangan', 'Liloan', 'San Juan'],
  'Sultan Kudarat': ['Isulan', 'Tacurong City', 'Lebak', 'Esperanza', 'Kalamansig', 'President Quirino', 'Bagumbayan'],
  'Sulu': ['Jolo', 'Patikul', 'Indanan', 'Siasi', 'Maimbung', 'Talipao'],
  'Surigao del Norte': ['Surigao City', 'General Luna (Siargao)', 'Dapa', 'Del Carmen', 'Placer', 'Claver'],
  'Surigao del Sur': ['Tandag City', 'Bislig City', 'Hinatuan', 'Cantilan', 'Barobo', 'Cagwait', 'Tagbina'],
  'Tarlac': ['Tarlac City', 'Capas', 'Concepcion', 'Paniqui', 'Gerona', 'Camiling', 'Victoria'],
  'Tawi-Tawi': ['Bongao', 'Panglima Sugala', 'Simunul', 'Sitangkai', 'South Ubian', 'Languyan'],
  'Zambales': ['Olongapo City', 'Subic', 'Iba', 'Castillejos', 'San Marcelino', 'Botolan', 'San Antonio'],
  'Zamboanga del Norte': ['Dipolog City', 'Dapitan City', 'Sindangan', 'Liloy', 'Siocon', 'Labason'],
  'Zamboanga del Sur': ['Pagadian City', 'Zamboanga City', 'Molave', 'Dumalinao', 'Aurora', 'Dumingag'],
  'Zamboanga Sibugay': ['Ipil', 'Titay', 'Imelda', 'Kabasalan', 'Siay', 'Buug'],

  // United States
  'California': [
    'San Francisco',
    'Oakland',
    'San Jose',
    'Los Angeles',
    'San Diego',
    'Sacramento',
    'Berkeley'
  ],
  'New York': [
    'New York City',
    'Brooklyn',
    'Queens',
    'Buffalo',
    'Albany'
  ],
  'Texas': [
    'Austin',
    'Houston',
    'Dallas',
    'San Antonio',
    'Fort Worth'
  ],
  'Washington': [
    'Seattle',
    'Bellevue',
    'Tacoma',
    'Spokane'
  ],
  'Illinois': [
    'Chicago',
    'Naperville',
    'Evanston'
  ],
  'Florida': [
    'Miami',
    'Orlando',
    'Tampa',
    'Jacksonville'
  ],
  'Massachusetts': [
    'Boston',
    'Cambridge',
    'Worcester'
  ],
  'Oregon': [
    'Portland',
    'Eugene',
    'Salem'
  ],

  // Canada
  'Ontario': ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton'],
  'British Columbia': ['Vancouver', 'Victoria', 'Burnaby', 'Surrey'],
  'Quebec': ['Montreal', 'Quebec City', 'Laval'],
  'Alberta': ['Calgary', 'Edmonton'],

  // United Kingdom
  'Greater London': ['London', 'Westminster', 'Camden'],
  'Greater Manchester': ['Manchester', 'Salford'],
  'West Midlands': ['Birmingham', 'Coventry'],
  'Scotland': ['Edinburgh', 'Glasgow'],

  // Australia
  'New South Wales': ['Sydney', 'Newcastle', 'Wollongong'],
  'Victoria': ['Melbourne', 'Geelong'],
  'Queensland': ['Brisbane', 'Gold Coast'],

  // Japan
  'Tokyo': ['Shinjuku', 'Shibuya', 'Chiyoda'],
  'Osaka': ['Osaka City', 'Sakai'],
  'Kyoto': ['Kyoto City'],

  'General Region': ['Main District']
};

export const PRESET_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Dumaguete and Negros Oriental
  'Dumaguete City': { lat: 9.3068, lng: 123.3054 },
  'Daro': { lat: 9.3142, lng: 123.3005 },
  'Bantayan': { lat: 9.3245, lng: 123.3082 },
  'Tinago': { lat: 9.3090, lng: 123.3110 },
  'Central Visayas': { lat: 9.8169, lng: 123.5970 },
  'Bais City': { lat: 9.5911, lng: 123.1219 },
  'Tanjay City': { lat: 9.5167, lng: 123.1500 },
  'Bayawan City': { lat: 9.3667, lng: 122.8000 },
  'Sibulan': { lat: 9.3564, lng: 123.2842 },
  'Valencia': { lat: 9.2833, lng: 123.2500 },
  'Bacong': { lat: 9.2458, lng: 123.2986 },
  'Negros Oriental': { lat: 9.3068, lng: 123.3054 },

  // Philippines Other & Provincial Capitals
  'Cebu City': { lat: 10.3157, lng: 123.8854 },
  'Mandaue City': { lat: 10.3396, lng: 123.9416 },
  'Lapu-Lapu City': { lat: 10.3115, lng: 123.9534 },
  'Cebu': { lat: 10.3157, lng: 123.8854 },
  'Manila': { lat: 14.5995, lng: 120.9842 },
  'Quezon City': { lat: 14.6760, lng: 121.0437 },
  'Makati': { lat: 14.5547, lng: 121.0244 },
  'Taguig (BGC)': { lat: 14.5492, lng: 121.0509 },
  'Pasig': { lat: 14.5764, lng: 121.0851 },
  'Metro Manila': { lat: 14.5995, lng: 120.9842 },
  'Davao City': { lat: 7.1907, lng: 125.4578 },
  'Iloilo City': { lat: 10.7202, lng: 122.5621 },
  'Baguio City': { lat: 16.4023, lng: 120.5960 },
  'Bacolod City': { lat: 10.6765, lng: 122.9509 },
  'Cagayan de Oro City': { lat: 8.4822, lng: 124.6472 },
  'Zamboanga City': { lat: 6.9214, lng: 122.0790 },
  'General Santos City': { lat: 6.1164, lng: 125.1716 },
  'Tagbilaran City': { lat: 9.6444, lng: 123.8556 },
  'Tacloban City': { lat: 11.2433, lng: 125.0039 },
  'Puerto Princesa City': { lat: 9.7392, lng: 118.7353 },
  'San Fernando City': { lat: 15.0333, lng: 120.6833 },
  'Angeles City': { lat: 15.1450, lng: 120.5887 },
  'Batangas City': { lat: 13.7565, lng: 121.0583 },
  'Lipa City': { lat: 13.9419, lng: 121.1644 },
  'Tagaytay City': { lat: 14.1153, lng: 120.9621 },
  'Antipolo City': { lat: 14.5842, lng: 121.1764 },
  'Legazpi City': { lat: 13.1391, lng: 123.7438 },
  'Naga City': { lat: 13.6218, lng: 123.1948 },
  'Olongapo City': { lat: 14.8386, lng: 120.2842 },
  'Malay (Boracay)': { lat: 11.9674, lng: 121.9248 },
  'Philippines': { lat: 12.8797, lng: 121.7740 },

  // All 82 Philippine Provinces
  'Abra': { lat: 17.5878, lng: 120.6200 },
  'Agusan del Norte': { lat: 8.9515, lng: 125.5280 },
  'Agusan del Sur': { lat: 8.5284, lng: 125.7500 },
  'Aklan': { lat: 11.7072, lng: 122.3663 },
  'Albay': { lat: 13.1391, lng: 123.7438 },
  'Antique': { lat: 10.7432, lng: 121.9427 },
  'Apayao': { lat: 18.0667, lng: 121.1667 },
  'Aurora': { lat: 15.7594, lng: 121.5625 },
  'Basilan': { lat: 6.5744, lng: 122.0367 },
  'Bataan': { lat: 14.6806, lng: 120.5417 },
  'Batanes': { lat: 20.4485, lng: 121.9708 },
  'Batangas': { lat: 13.7565, lng: 121.0583 },
  'Benguet': { lat: 16.4023, lng: 120.5960 },
  'Biliran': { lat: 11.5833, lng: 124.4667 },
  'Bohol': { lat: 9.8500, lng: 124.1435 },
  'Bukidnon': { lat: 8.1564, lng: 125.1278 },
  'Bulacan': { lat: 14.8527, lng: 120.8160 },
  'Cagayan': { lat: 17.6132, lng: 121.7270 },
  'Camarines Norte': { lat: 14.1167, lng: 122.9500 },
  'Camarines Sur': { lat: 13.6218, lng: 123.1948 },
  'Camiguin': { lat: 9.1731, lng: 124.7299 },
  'Capiz': { lat: 11.5853, lng: 122.7511 },
  'Catanduanes': { lat: 13.7844, lng: 124.2378 },
  'Cavite': { lat: 14.2456, lng: 120.8786 },
  'Cotabato': { lat: 7.0094, lng: 125.0894 },
  'Davao de Oro': { lat: 7.6042, lng: 125.9642 },
  'Davao del Norte': { lat: 7.4478, lng: 125.8078 },
  'Davao del Sur': { lat: 7.1907, lng: 125.4578 },
  'Davao Occidental': { lat: 6.4139, lng: 125.6139 },
  'Davao Oriental': { lat: 6.9564, lng: 126.2167 },
  'Dinagat Islands': { lat: 10.1269, lng: 125.6083 },
  'Eastern Samar': { lat: 11.6083, lng: 125.4333 },
  'Guimaras': { lat: 10.5928, lng: 122.5878 },
  'Ifugao': { lat: 16.7833, lng: 121.1167 },
  'Ilocos Norte': { lat: 18.1979, lng: 120.5931 },
  'Ilocos Sur': { lat: 17.5706, lng: 120.3872 },
  'Iloilo': { lat: 10.7202, lng: 122.5621 },
  'Isabela': { lat: 17.1583, lng: 121.8833 },
  'Kalinga': { lat: 17.4500, lng: 121.4333 },
  'La Union': { lat: 16.6159, lng: 120.3209 },
  'Laguna': { lat: 14.2691, lng: 121.4113 },
  'Lanao del Norte': { lat: 8.2280, lng: 124.2452 },
  'Lanao del Sur': { lat: 7.9986, lng: 124.2928 },
  'Leyte': { lat: 11.2433, lng: 124.9983 },
  'Maguindanao del Norte': { lat: 7.1667, lng: 124.2500 },
  'Maguindanao del Sur': { lat: 6.7167, lng: 124.8000 },
  'Marinduque': { lat: 13.4444, lng: 121.9556 },
  'Masbate': { lat: 12.3711, lng: 123.6333 },
  'Misamis Occidental': { lat: 8.4833, lng: 123.8000 },
  'Misamis Oriental': { lat: 8.4822, lng: 124.6472 },
  'Mountain Province': { lat: 17.0833, lng: 120.9833 },
  'Negros Occidental': { lat: 10.6667, lng: 122.9500 },
  'Northern Samar': { lat: 12.5000, lng: 124.6333 },
  'Nueva Ecija': { lat: 15.4869, lng: 120.9678 },
  'Nueva Vizcaya': { lat: 16.4833, lng: 121.1500 },
  'Occidental Mindoro': { lat: 13.2167, lng: 120.7667 },
  'Oriental Mindoro': { lat: 13.4117, lng: 121.1803 },
  'Palawan': { lat: 9.8349, lng: 118.7384 },
  'Pampanga': { lat: 15.0333, lng: 120.6833 },
  'Pangasinan': { lat: 16.0224, lng: 120.3344 },
  'Quezon': { lat: 13.9314, lng: 121.6172 },
  'Quirino': { lat: 16.2833, lng: 121.5167 },
  'Rizal': { lat: 14.5842, lng: 121.1764 },
  'Romblon': { lat: 12.5769, lng: 122.2711 },
  'Samar': { lat: 11.7753, lng: 124.8858 },
  'Sarangani': { lat: 6.0833, lng: 125.2833 },
  'Siquijor': { lat: 9.1999, lng: 123.5952 },
  'Sorsogon': { lat: 12.9742, lng: 124.0058 },
  'South Cotabato': { lat: 6.1164, lng: 125.1716 },
  'Southern Leyte': { lat: 10.1333, lng: 124.9833 },
  'Sultan Kudarat': { lat: 6.6167, lng: 124.6000 },
  'Sulu': { lat: 6.0500, lng: 121.0000 },
  'Surigao del Norte': { lat: 9.7917, lng: 125.4947 },
  'Surigao del Sur': { lat: 8.6500, lng: 126.1500 },
  'Tarlac': { lat: 15.4802, lng: 120.5979 },
  'Tawi-Tawi': { lat: 5.1667, lng: 119.9667 },
  'Zambales': { lat: 15.3333, lng: 120.0000 },
  'Zamboanga del Norte': { lat: 8.5833, lng: 123.3333 },
  'Zamboanga del Sur': { lat: 7.8256, lng: 123.4370 },
  'Zamboanga Sibugay': { lat: 7.7833, lng: 122.5833 },

  // US Cities
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  'Oakland': { lat: 37.8044, lng: -122.2712 },
  'San Jose': { lat: 37.3382, lng: -121.8863 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'San Diego': { lat: 32.7157, lng: -117.1611 },
  'California': { lat: 36.7783, lng: -119.4179 },
  'New York City': { lat: 40.7128, lng: -74.0060 },
  'Brooklyn': { lat: 40.6782, lng: -73.9442 },
  'Austin': { lat: 30.2672, lng: -97.7431 },
  'Houston': { lat: 29.7604, lng: -95.3698 },
  'Seattle': { lat: 47.6062, lng: -122.3321 },
  'Chicago': { lat: 41.8781, lng: -87.6298 },
  'Miami': { lat: 25.7617, lng: -80.1918 },
  'Boston': { lat: 42.3601, lng: -71.0589 },
  'United States': { lat: 37.0902, lng: -95.7129 },

  // Canada
  'Toronto': { lat: 43.6532, lng: -79.3832 },
  'Vancouver': { lat: 49.2827, lng: -123.1207 },
  'Montreal': { lat: 45.5017, lng: -73.5673 },
  'Canada': { lat: 56.1304, lng: -106.3468 },

  // UK
  'London': { lat: 51.5074, lng: -0.1278 },
  'Manchester': { lat: 53.4808, lng: -2.2426 },
  'United Kingdom': { lat: 55.3781, lng: -3.4360 },

  // Australia
  'Sydney': { lat: -33.8688, lng: 151.2093 },
  'Melbourne': { lat: -37.8136, lng: 144.9631 },
  'Australia': { lat: -25.2744, lng: 133.7751 },

  // Japan
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'Osaka City': { lat: 34.6937, lng: 135.5023 },
  'Japan': { lat: 36.2048, lng: 138.2529 }
};

/**
 * Resolves latitude and longitude for a given City, Province, and Country.
 */
export async function getCoordinatesForLocation(
  city?: string,
  province?: string,
  country?: string
): Promise<{ lat: number; lng: number }> {
  // Check preset table first
  if (city && PRESET_COORDINATES[city]) {
    return PRESET_COORDINATES[city];
  }
  if (province && PRESET_COORDINATES[province]) {
    return PRESET_COORDINATES[province];
  }
  if (country && PRESET_COORDINATES[country]) {
    return PRESET_COORDINATES[country];
  }

  // Try OpenStreetMap geocoding if network is available
  try {
    const query = [city, province, country].filter(Boolean).join(', ');
    if (query) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Geocoding lookup failed, using region defaults', err);
  }

  // Fallback defaults
  if (country?.toLowerCase().includes('philippine')) {
    return { lat: 9.3068, lng: 123.3054 }; // Default to Dumaguete / Central Visayas
  }
  return { lat: 37.7749, lng: -122.4194 };
}
