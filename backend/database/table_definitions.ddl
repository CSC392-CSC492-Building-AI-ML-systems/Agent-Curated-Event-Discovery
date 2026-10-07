-- uses postgis

CREATE TABLE IF NOT EXISTS TogatherEvent (
	id TEXT NOT NULL,
	name TEXT NOT NULL,
	description TEXT,
	startDate TEXT,
	endDate TEXT,
	locationName TEXT,
	insertedDateTime TIMESTAMP DEFAULT now(),
	PRIMARY KEY (id)
);

-- if the event is online put the address as "online"
CREATE TABLE IF NOT EXISTS Venue (
	id SERIAL,
	name TEXT NOT NULL,
	address TEXT NOT NULL,
	coordinates GEOGRAPHY,
	PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS Organizer (
	id SERIAL,
	name TEXT NOT NULL,
	contact TEXT,
	socials TEXT,
	PRIMARY KEY(id)
);

CREATE TABLE IF NOT EXISTS Tag (
	id SERIAL,
	name TEXT,
	PRIMARY KEY(id)
);

CREATE TABLE IF NOT EXISTS Event (
	id SERIAL,
	name TEXT NOT NULL,
	description TEXT NOT NULL,
	startDateTime TIMESTAMP NOT NULL,
	endDateTime TIMESTAMP NOT NULL,
	venue INTEGER NOT NULL,
	organizer INTEGER,
	price DECIMAL(6, 2),
	link TEXT NOT NULL,
	eighteenPlus BOOLEAN NOT NULL,
	PRIMARY KEY(id),
	FOREIGN KEY (venue) REFERENCES Venue(id) ON DELETE RESTRICT,
	FOREIGN KEY (organizer) REFERENCES Organizer(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS EventTags (
	eventId INTEGER,
	tagId INTEGER,
	PRIMARY KEY(eventId, tagId),
	FOREIGN KEY (eventId) REFERENCES Event(id) ON DELETE CASCADE,
	FOREIGN KEY (tagId) REFERENCES Tag(id) ON DELETE CASCADE
);